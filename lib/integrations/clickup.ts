import axios from 'axios'

const CLICKUP_API_URL = 'https://api.clickup.com/api/v2'
const CLICKUP_TOKEN = process.env.CLICKUP_API_TOKEN
const CLICKUP_SPACE_ID = process.env.CLICKUP_SPACE_ID

interface ClickUpTask {
  id: string
  name: string
  description: string
  status: {
    status: string
    color: string
  }
  priority: {
    priority: string
  } | null
  due_date: string | null
  start_date: string | null
  assignees: Array<{ username: string; email: string }>
  url: string
}

interface ClickUpList {
  id: string
  name: string
}

class ClickUpClient {
  private get headers() {
    return {
      'Authorization': CLICKUP_TOKEN || '',
      'Content-Type': 'application/json'
    }
  }

  async getLists(): Promise<{ success: boolean; lists?: ClickUpList[]; error?: string }> {
    try {
      if (!CLICKUP_TOKEN || !CLICKUP_SPACE_ID) {
        return { success: false, error: 'ClickUp credentials not configured' }
      }

      let allLists: ClickUpList[] = []

      // 1. Get folderless lists
      try {
        const response = await axios.get(
          `${CLICKUP_API_URL}/space/${CLICKUP_SPACE_ID}/list`,
          { headers: this.headers }
        )
        if (response.data.lists) {
          allLists = [...response.data.lists]
        }
      } catch (err) {
        console.warn('Error fetching folderless lists', err)
      }

      // 2. Get folders and their lists
      try {
        const foldersResponse = await axios.get(
          `${CLICKUP_API_URL}/space/${CLICKUP_SPACE_ID}/folder`,
          { headers: this.headers }
        )
        const folders = foldersResponse.data.folders || []

        for (const folder of folders) {
          const folderListsResponse = await axios.get(
            `${CLICKUP_API_URL}/folder/${folder.id}/list`,
            { headers: this.headers }
          )
          if (folderListsResponse.data.lists) {
            // Append folder name to list name for clarity
            const folderLists = folderListsResponse.data.lists.map((l: any) => ({
              ...l,
              name: `${folder.name} > ${l.name}`
            }))
            allLists = [...allLists, ...folderLists]
          }
        }
      } catch (folderError: any) {
        console.warn('Error fetching folders:', folderError.message)
      }

      return { success: true, lists: allLists }
    } catch (error: any) {
      console.error('ClickUp getLists error:', error.response?.data || error.message)
      return { success: false, error: error.response?.data?.err || error.message }
    }
  }

  async getTasks(listId?: string): Promise<{ success: boolean; tasks?: ClickUpTask[]; error?: string }> {
    try {
      if (!CLICKUP_TOKEN || !CLICKUP_SPACE_ID) {
        return { success: false, error: 'ClickUp credentials not configured' }
      }

      // If a specific list ID is provided, just fetch that
      if (listId) {
        const response = await axios.get(
          `${CLICKUP_API_URL}/list/${listId}/task`,
          {
            headers: this.headers,
            params: { subtasks: true, include_closed: false }
          }
        )
        return { success: true, tasks: response.data.tasks }
      }

      // Otherwise, we need to find ALL lists in the space (both folderless and within folders)
      const listResult = await this.getLists()
      if (!listResult.success || !listResult.lists || listResult.lists.length === 0) {
        return { success: true, tasks: [] }
      }

      const allLists = listResult.lists

      // 4. Fetch tasks from all lists
      const taskPromises = allLists.map(list =>
        axios.get(
          `${CLICKUP_API_URL}/list/${list.id}/task`,
          {
            headers: this.headers,
            params: { subtasks: true, include_closed: false }
          }
        ).then(res => res.data.tasks).catch(err => {
          console.error(`Failed to fetch tasks for list ${list.id}:`, err.message)
          return []
        })
      )

      const tasksArrays = await Promise.all(taskPromises)
      // Flatten arrays
      const allTasks = tasksArrays.flat()

      return { success: true, tasks: allTasks }
    } catch (error: any) {
      console.error('ClickUp getTasks error:', error.response?.data || error.message)
      return { success: false, error: error.response?.data?.err || error.message }
    }
  }

  async createTask(listId: string, task: {
    name: string
    description?: string
    priority?: number
    due_date?: number
    status?: string
  }): Promise<{ success: boolean; task?: ClickUpTask; error?: string }> {
    try {
      if (!CLICKUP_TOKEN) {
        return { success: false, error: 'ClickUp credentials not configured' }
      }

      const response = await axios.post(
        `${CLICKUP_API_URL}/list/${listId}/task`,
        task,
        { headers: this.headers }
      )

      return { success: true, task: response.data }
    } catch (error: any) {
      console.error('ClickUp createTask error:', error.response?.data || error.message)
      return { success: false, error: error.response?.data?.err || error.message }
    }
  }

  async updateTask(taskId: string, updates: {
    name?: string
    description?: string
    status?: string
    priority?: number
    due_date?: number
  }): Promise<{ success: boolean; task?: ClickUpTask; error?: string }> {
    try {
      if (!CLICKUP_TOKEN) {
        return { success: false, error: 'ClickUp credentials not configured' }
      }

      const response = await axios.put(
        `${CLICKUP_API_URL}/task/${taskId}`,
        updates,
        { headers: this.headers }
      )

      return { success: true, task: response.data }
    } catch (error: any) {
      console.error('ClickUp updateTask error:', error.response?.data || error.message)
      return { success: false, error: error.response?.data?.err || error.message }
    }
  }

  async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      if (!CLICKUP_TOKEN) {
        return { success: false, error: 'CLICKUP_API_TOKEN not set' }
      }

      const response = await axios.get(
        `${CLICKUP_API_URL}/team`,
        { headers: this.headers }
      )

      return { success: response.status === 200 }
    } catch (error: any) {
      return { success: false, error: error.response?.data?.err || error.message }
    }
  }
}

export const clickupClient = new ClickUpClient()
export type { ClickUpTask, ClickUpList }
