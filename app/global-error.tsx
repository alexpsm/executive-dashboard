'use client'

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    return (
        <html>
            <body>
                <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
                    <div className="bg-white p-8 rounded-xl shadow-lg text-center">
                        <h2 className="text-2xl font-bold text-red-600 mb-4">Critical System Error</h2>
                        <p className="text-gray-600 mb-6">{error.message}</p>
                        <button
                            onClick={() => reset()}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                        >
                            Restart Application
                        </button>
                    </div>
                </div>
            </body>
        </html>
    )
}
