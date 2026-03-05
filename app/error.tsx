'use client' // Error components must be Client Components

import { useEffect } from 'react'

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    useEffect(() => {
        // Log the error to an error reporting service
        console.error(error)
    }, [error])

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-mesh p-4">
            <div className="bg-white/80 backdrop-blur-xl p-8 rounded-2xl shadow-xl border border-white/50 text-center max-w-md">
                <h2 className="text-2xl font-bold text-red-600 mb-4">Something went wrong!</h2>
                <p className="text-gray-600 mb-6 bg-red-50 p-3 rounded-lg text-sm font-mono text-left overflow-auto max-h-40">
                    {error.message || "Unknown error occurred"}
                </p>
                <button
                    onClick={
                        // Attempt to recover by trying to re-render the segment
                        () => reset()
                    }
                    className="btn-primary"
                >
                    Try again
                </button>
            </div>
        </div>
    )
}
