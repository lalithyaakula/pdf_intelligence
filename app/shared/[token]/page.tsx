"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { 
  FileText, 
  Send, 
  User, 
  MessageCircle,
  Loader2,
  ArrowLeft,
  Calendar
} from "lucide-react"

interface Comment {
  id: string
  content: string
  userId: string | null
  user: {
    name: string
    email: string
  } | null
  isInvited: boolean
  invitedName: string | null
  createdAt: string
}

interface Document {
  id: string
  filename: string
  filePath: string
  fileSize: number
  summary: string | null
  shareToken: string
  user: {
    name: string
    email: string
  }
  comments: Comment[]
  createdAt: string
}

export default function SharedDocumentPage() {
  const params = useParams()
  const token = params.token as string
  const [document, setDocument] = useState<Document | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [comment, setComment] = useState("")
  const [invitedName, setInvitedName] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [showNameInput, setShowNameInput] = useState(true)

  useEffect(() => {
    fetchDocument()
  }, [token])

  const fetchDocument = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/documents/${token}?shareToken=${token}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Document not found or share link invalid")
      }

      setDocument(data.data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!comment.trim()) return

    const name = invitedName.trim() || "Guest"

    setSubmitting(true)
    try {
      const response = await fetch(`/api/documents/${document?.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          content: comment,
          isInvited: true,
          invitedName: name
        })
      })

      const data = await response.json()
      if (response.ok) {
        setComment("")
        setShowNameInput(false)
        await fetchDocument()
      }
    } catch (error) {
      alert("Failed to post comment")
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center">
          <Loader2 className="h-12 w-12 animate-spin text-indigo-600" />
          <p className="mt-4 text-gray-600">Loading shared document...</p>
        </div>
      </div>
    )
  }

  if (error || !document) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200 max-w-md w-full text-center">
          <FileText className="h-12 w-12 text-gray-400 mx-auto mb-3" />
          <p className="text-red-600">{error || "Document not found"}</p>
          <p className="text-sm text-gray-500 mt-2">The share link may be invalid or expired</p>
          <Link
            href="/"
            className="mt-4 inline-block text-indigo-600 hover:text-indigo-800"
          >
            ← Go to Home
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white shadow-sm border-b border-gray-200 px-4 py-3 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <Link
              href="/"
              className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
              <span>Home</span>
            </Link>
            <div className="flex items-center space-x-2">
              <FileText className="h-5 w-5 text-indigo-600" />
              <span className="font-medium text-gray-900 truncate max-w-xs">
                Shared: {document.filename}
              </span>
            </div>
          </div>
          <div className="flex items-center space-x-2 text-sm text-gray-500">
            <User className="h-4 w-4" />
            <span>Shared by {document.user.name}</span>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Document Info */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Shared Document</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Filename:</span>
                  <span className="font-medium text-gray-900">{document.filename}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Uploaded by:</span>
                  <span className="font-medium text-gray-900">{document.user.name}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Uploaded:</span>
                  <span className="font-medium text-gray-900">
                    {new Date(document.createdAt).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900 mb-3">AI Summary</h3>
              <p className="text-gray-700 leading-relaxed">
                {document.summary || "No summary available"}
              </p>
            </div>

            {/* PDF Viewer Placeholder */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900 mb-3">PDF Viewer</h3>
              <div className="bg-gray-100 rounded-lg h-96 flex items-center justify-center border-2 border-dashed border-gray-300">
                <div className="text-center">
                  <FileText className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-500">PDF Viewer</p>
                  <p className="text-sm text-gray-400 mt-1">Shared PDF will be displayed here</p>
                </div>
              </div>
            </div>
          </div>

          {/* Comments Section */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 sticky top-20 h-[calc(100vh-8rem)] flex flex-col">
              <div className="flex items-center space-x-2 mb-4 pb-4 border-b border-gray-200">
                <MessageCircle className="h-5 w-5 text-indigo-600" />
                <h3 className="font-semibold text-gray-900">Comments</h3>
                <span className="text-sm text-gray-500 ml-auto">
                  {document.comments.length}
                </span>
              </div>

              <div className="flex-1 overflow-y-auto space-y-4 mb-4">
                {document.comments.length === 0 ? (
                  <p className="text-gray-400 text-center py-8">No comments yet</p>
                ) : (
                  document.comments.map((comment) => (
                    <div key={comment.id} className="border-l-2 border-indigo-200 pl-3">
                      <div className="flex items-center space-x-2 mb-1">
                        <div className="w-6 h-6 bg-indigo-100 rounded-full flex items-center justify-center">
                          <User className="h-3 w-3 text-indigo-600" />
                        </div>
                        <span className="text-sm font-medium text-gray-900">
                          {comment.isInvited ? comment.invitedName || "Guest" : comment.user?.name || "Anonymous"}
                        </span>
                        <span className="text-xs text-gray-400">
                          {new Date(comment.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700">{comment.content}</p>
                    </div>
                  ))
                )}
              </div>

              <form onSubmit={handleCommentSubmit} className="mt-auto space-y-3">
                {showNameInput && (
                  <input
                    type="text"
                    placeholder="Your name (optional)"
                    value={invitedName}
                    onChange={(e) => setInvitedName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                  />
                )}
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    placeholder="Add a comment..."
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                    disabled={submitting}
                  />
                  <button
                    type="submit"
                    disabled={!comment.trim() || submitting}
                    className="p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {submitting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}