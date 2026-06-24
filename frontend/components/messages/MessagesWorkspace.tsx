"use client"

import { useEffect, useState, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import {
    getConversations,
    getMessages,
    sendMessage,
    markMessagesRead,
    getContacts,
    uploadAttachment,
    Conversation,
    ChatMessage,
    Contact,
    getCurrentUser,
    getToken
} from "@/services"
import BuyerNavbar from "@/components/buyer/BuyerNavbar"
import SupplierNavbar from "@/components/supplier/SupplierNavbar"
import BuyerFooter from "@/components/buyer/BuyerFooter"
import SupplierFooter from "@/components/supplier/SupplierFooter"
import { MessageSquare, Send, Plus, Search, User, ArrowLeft, Loader2, Paperclip, Smile, ShieldCheck, X, FileText, Image } from "lucide-react"

interface MessagesWorkspaceProps {
    userRole: "buyer" | "supplier"
}

export default function MessagesWorkspace({ userRole }: MessagesWorkspaceProps) {
    const router = useRouter()
    const searchParams = useSearchParams()
    const queryPartnerId = searchParams.get("partner_id")

    const [conversations, setConversations] = useState<Conversation[]>([])
    const [conversationsLoaded, setConversationsLoaded] = useState(false)
    const [activePartner, setActivePartner] = useState<Conversation | null>(null)
    const [messages, setMessages] = useState<ChatMessage[]>([])
    const [contacts, setContacts] = useState<Contact[]>([])
    const [searchContactQuery, setSearchContactQuery] = useState("")
    const [searchConvQuery, setSearchConvQuery] = useState("")
    const [showNewChatModal, setShowNewChatModal] = useState(false)
    const [newMessage, setNewMessage] = useState("")
    const [userId, setUserId] = useState<number | null>(null)
    const [username, setUsername] = useState("")
    const [buyerType, setBuyerType] = useState<string | null>(null)
    const [hasActiveSub, setHasActiveSub] = useState(true)
    const [loading, setLoading] = useState(true)
    const [sending, setSending] = useState(false)
    const messagesEndRef = useRef<HTMLDivElement>(null)
    const [selectedFile, setSelectedFile] = useState<File | null>(null)
    const [filePreview, setFilePreview] = useState<string | null>(null)
    const [fileType, setFileType] = useState<"image" | "document" | null>(null)
    const [showEmojiPicker, setShowEmojiPicker] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)

    // Fetch initial profile & check auth
    useEffect(() => {
        const init = async () => {
            if (!getToken()) {
                router.replace("/login")
                return
            }
            try {
                const me = await getCurrentUser()
                if (me) {
                    setUserId(me.id)
                    setUsername(me.username)
                    setBuyerType(me.buyer_type || null)
                    setHasActiveSub(me.has_active_subscription !== false)
                }
            } catch (err) {
                router.replace("/login")
            } finally {
                setLoading(false)
            }
        }
        init()
    }, [router])

    // Poll conversations list & active chat messages
    useEffect(() => {
        if (!getToken() || userId === null) return

        const loadConversations = async () => {
            try {
                const data = await getConversations()
                setConversations(data)
                setConversationsLoaded(true)
            } catch (err) {
                console.error("Error loading conversations", err)
            }
        }

        loadConversations()
        const convTimer = setInterval(loadConversations, 3000)

        return () => clearInterval(convTimer)
    }, [userId])

    // Resolve partner_id query param to start a conversation
    useEffect(() => {
        if (!getToken() || userId === null || !queryPartnerId || !conversationsLoaded) return

        const partnerId = parseInt(queryPartnerId, 10)
        if (isNaN(partnerId)) return

        const existing = conversations.find(c => c.partner_id === partnerId)
        if (existing) {
            setActivePartner(existing)
        } else {
            const getContactAndStart = async () => {
                try {
                    const list = await getContacts()
                    const found = list.find(c => c.id === partnerId)
                    if (found) {
                        const newPartner: Conversation = {
                            partner_id: found.id,
                            partner_username: found.username,
                            partner_email: found.email,
                            partner_role: found.role,
                            company_name: found.company_name,
                            last_message: "",
                            last_message_time: null,
                            unread_count: 0
                        }
                        setConversations(prev => {
                            if (prev.some(c => c.partner_id === partnerId)) return prev
                            return [newPartner, ...prev]
                        })
                        setActivePartner(newPartner)
                    } else {
                        // Fallback placeholder
                        const newPartner: Conversation = {
                            partner_id: partnerId,
                            partner_username: `User #${partnerId}`,
                            partner_role: userRole === "buyer" ? "supplier" : "buyer",
                            company_name: `User #${partnerId}`,
                            last_message: "",
                            last_message_time: null,
                            unread_count: 0
                        }
                        setConversations(prev => {
                            if (prev.some(c => c.partner_id === partnerId)) return prev
                            return [newPartner, ...prev]
                        })
                        setActivePartner(newPartner)
                    }
                } catch (e) {
                    console.error("Error setting query partner", e)
                }
            }
            getContactAndStart()
        }
    }, [userId, queryPartnerId, conversationsLoaded])

    // Poll active chat messages
    useEffect(() => {
        if (!getToken() || userId === null || !activePartner) {
            setMessages([])
            return
        }

        const loadMessages = async () => {
            try {
                const data = await getMessages(activePartner.partner_id)
                setMessages(data)
                // Mark read
                await markMessagesRead(activePartner.partner_id)
            } catch (err) {
                console.error("Error loading messages", err)
            }
        }

        loadMessages()
        const msgTimer = setInterval(loadMessages, 2000)

        return () => clearInterval(msgTimer)
    }, [userId, activePartner])



    // Load contacts for starting a chat
    const handleOpenNewChat = async () => {
        setShowNewChatModal(true)
        try {
            const data = await getContacts()
            setContacts(data)
        } catch (err) {
            console.error("Error loading contacts", err)
        }
    }

    const handleStartChat = (contact: Contact) => {
        // Check if conversation already exists
        const existing = conversations.find(c => c.partner_id === contact.id)
        if (existing) {
            setActivePartner(existing)
        } else {
            const newPartner: Conversation = {
                partner_id: contact.id,
                partner_username: contact.username,
                partner_role: contact.role,
                company_name: contact.company_name,
                last_message: "",
                last_message_time: null,
                unread_count: 0
            }
            setConversations(prev => [newPartner, ...prev])
            setActivePartner(newPartner)
        }
        setShowNewChatModal(false)
    }

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        setSelectedFile(file)
        const isImage = file.type.startsWith("image/")
        setFileType(isImage ? "image" : "document")

        if (isImage) {
            const reader = new FileReader()
            reader.onloadend = () => {
                setFilePreview(reader.result as string)
            }
            reader.readAsDataURL(file)
        } else {
            setFilePreview(null)
        }
    }

    const handleRemoveFile = () => {
        setSelectedFile(null)
        setFilePreview(null)
        setFileType(null)
        if (fileInputRef.current) {
            fileInputRef.current.value = ""
        }
    }

    const handleEmojiClick = (emoji: string) => {
        setNewMessage(prev => prev + emoji)
        setShowEmojiPicker(false)
    }

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!activePartner || sending) return
        if (!newMessage.trim() && !selectedFile) return

        setSending(true)
        try {
            let attachmentUrl: string | undefined = undefined
            let attachmentName: string | undefined = undefined
            let attachmentType: string | undefined = undefined

            if (selectedFile) {
                const uploaded = await uploadAttachment(selectedFile)
                attachmentUrl = uploaded.url
                attachmentName = uploaded.name
                attachmentType = uploaded.type
            }

            const sent = await sendMessage(
                activePartner.partner_id,
                newMessage.trim(),
                attachmentUrl,
                attachmentType,
                attachmentName
            )
            setMessages(prev => [...prev, sent])
            setNewMessage("")
            setSelectedFile(null)
            setFilePreview(null)
            setFileType(null)
            if (fileInputRef.current) {
                fileInputRef.current.value = ""
            }

            // Update conversations list locally instantly
            setConversations(prev => {
                return prev.map(c => {
                    if (c.partner_id === activePartner.partner_id) {
                        return {
                            ...c,
                            last_message: sent.content || (sent.attachment_name ? `📎 ${sent.attachment_name}` : "Sent an attachment"),
                            last_message_time: sent.created_at
                        }
                    }
                    return c
                })
            })
        } catch (err) {
            console.error("Error sending message", err)
        } finally {
            setSending(false)
        }
    }

    const formatTime = (timeStr: string | null) => {
        if (!timeStr) return ""
        const d = new Date(timeStr)
        return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    }

    const filteredConversations = conversations.filter(c =>
        c.partner_username.toLowerCase().includes(searchConvQuery.toLowerCase()) ||
        c.company_name.toLowerCase().includes(searchConvQuery.toLowerCase()) ||
        (c.partner_email && c.partner_email.toLowerCase().includes(searchConvQuery.toLowerCase()))
    )

    const filteredContacts = contacts.filter(c =>
        c.username.toLowerCase().includes(searchContactQuery.toLowerCase()) ||
        c.company_name.toLowerCase().includes(searchContactQuery.toLowerCase()) ||
        (c.email && c.email.toLowerCase().includes(searchContactQuery.toLowerCase()))
    )

    if (loading) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-slate-50">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-[#f6f8fb] flex flex-col">
            {userRole === "buyer" ? (
                <BuyerNavbar
                    active="messages"
                    username={username}
                    buyerType={buyerType || null}
                    hasActiveSubscription={hasActiveSub}
                />
            ) : (
                <SupplierNavbar
                    active="messages"
                    username={username}
                />
            )}

            <main className="flex-1 flex flex-col w-full py-4 md:py-8 lg:py-12 mx-auto max-w-[1600px] px-3 sm:px-6 md:px-8 pb-4 lg:pb-8">
                <div className="flex-1 flex flex-col gap-3 sm:gap-6 min-h-0">
                    <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-4 shrink-0">
                        <div>
                            <h1 className="text-lg sm:text-2xl lg:text-3xl font-black tracking-[-0.03em] text-slate-800">
                                Secure <span className="text-blue-600">Messages Workspace</span>
                            </h1>
                            <p className="text-xs sm:text-sm font-semibold text-slate-500 mt-0.5 sm:mt-1">
                                Direct, secure B2B communications for order discussions, quotations, and verified trade agreements.
                            </p>
                        </div>
                    </header>

                    {/* Messages Panel Container */}
                    <div className="flex-1 min-h-0 rounded-xl sm:rounded-2xl border border-slate-200 bg-white shadow-[0_10px_28px_rgba(15,23,42,0.04)] grid lg:grid-cols-[300px_1fr] xl:grid-cols-[340px_1fr]" style={{overflow: 'clip'}}>

                        {/* Conversations Sidebar */}
                        <div className={`flex flex-col border-r border-slate-100 bg-slate-50/30 ${activePartner ? "hidden lg:flex" : "flex"}`}>
                            <div className="p-3 sm:p-4 border-b border-slate-100 flex flex-col gap-2 sm:gap-3">
                                <button
                                    type="button"
                                    onClick={handleOpenNewChat}
                                    className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-xs py-2.5 sm:py-3 px-4 rounded-xl transition duration-150 shadow-sm"
                                >
                                    <Plus className="h-4 w-4" />
                                    New Conversation
                                </button>
                                <div className="relative">
                                    <Search className="absolute left-3 top-3 h-3.5 w-3.5 text-slate-400" />
                                    <input
                                        value={searchConvQuery}
                                        onChange={(e) => setSearchConvQuery(e.target.value)}
                                        placeholder="Search conversations..."
                                        className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-xs bg-slate-50 hover:bg-slate-100/50 focus:bg-white text-slate-800 transition duration-150 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                    />
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto custom-scrollbar p-2 sm:p-3 space-y-1">
                                {filteredConversations.length === 0 ? (
                                    <div className="text-center py-10 text-slate-400 text-xs font-bold">
                                        No active chats. Start one!
                                    </div>
                                ) : (
                                    filteredConversations.map((c) => {
                                        const isSelected = activePartner?.partner_id === c.partner_id
                                        return (
                                            <button
                                                key={c.partner_id}
                                                type="button"
                                                onClick={() => setActivePartner(c)}
                                                className={`w-full text-left p-2.5 sm:p-3 rounded-xl flex items-center gap-2.5 transition duration-150 active:scale-[0.98] ${isSelected
                                                    ? "bg-blue-50/70 border border-blue-100 shadow-sm"
                                                    : "hover:bg-slate-100/50 border border-transparent"
                                                    }`}
                                            >
                                                <div className={`h-9 w-9 sm:h-10 sm:w-10 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 transition ${isSelected ? "bg-blue-600 text-white" : "bg-slate-200 text-slate-600"}`}>
                                                    {c.partner_username.slice(0, 2).toUpperCase()}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center justify-between gap-1">
                                                        <p className="text-xs font-bold text-slate-800 truncate">{c.company_name}</p>
                                                        <span className="text-[9px] text-slate-400 font-semibold shrink-0">{formatTime(c.last_message_time)}</span>
                                                    </div>
                                                    <p className="text-[11px] text-slate-400 truncate mt-0.5">{c.last_message || "No messages yet"}</p>
                                                </div>
                                                {c.unread_count > 0 && (
                                                    <span className="h-5 min-w-5 px-1.5 rounded-full bg-blue-600 text-[10px] font-black text-white flex items-center justify-center shrink-0">
                                                        {c.unread_count}
                                                    </span>
                                                )}
                                            </button>
                                        )
                                    })
                                )}
                            </div>
                        </div>

                        {/* Chat Area */}
                        <div className={`flex flex-col bg-white ${!activePartner ? "hidden lg:flex items-center justify-center text-center p-6 bg-slate-50/30" : "flex relative"}`}>
                            {activePartner ? (
                                <>
                                    {/* Chat Header */}
                                    <div className="px-3 sm:px-4 py-3 border-b border-slate-100 flex items-center justify-between gap-2 sm:gap-4 shrink-0 bg-white shadow-sm z-10">
                                        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                                            <button
                                                type="button"
                                                onClick={() => setActivePartner(null)}
                                                className="lg:hidden p-1.5 hover:bg-slate-100 active:bg-slate-200 rounded-lg text-slate-600 transition shrink-0"
                                            >
                                                <ArrowLeft className="h-4 w-4" />
                                            </button>
                                            <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-extrabold text-xs sm:text-sm shadow-sm ring-2 ring-blue-100 shrink-0">
                                                {activePartner.partner_username.slice(0, 2).toUpperCase()}
                                            </div>
                                            <div className="min-w-0">
                                                <h4 className="text-xs sm:text-sm font-bold text-slate-800 leading-tight truncate">
                                                    {activePartner.company_name && activePartner.company_name !== activePartner.partner_username
                                                        ? `${activePartner.company_name} (${activePartner.partner_username})`
                                                        : activePartner.partner_username}
                                                </h4>
                                                <div className="flex items-center gap-1 mt-0.5">
                                                    <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">
                                                        {activePartner.partner_role}
                                                    </span>
                                                    {activePartner.partner_email && (
                                                        <span className="hidden sm:inline text-[10px] font-medium text-slate-500 lowercase truncate">
                                                            • {activePartner.partner_email}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 border border-blue-100 text-[11px] font-bold rounded-full shrink-0">
                                            <ShieldCheck className="h-3 w-3 text-blue-600 shrink-0" />
                                            <span className="text-blue-700">Active</span>
                                        </div>
                                    </div>

                                    {/* Chat Messages */}
                                    <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 bg-slate-50/50 custom-scrollbar">
                                        {messages.length === 0 ? (
                                            <div className="flex flex-col items-center justify-center h-full text-center p-8">
                                                <div className="p-4 rounded-full bg-blue-50 text-blue-600 mb-3">
                                                    <MessageSquare className="h-6 w-6" />
                                                </div>
                                                <h5 className="text-sm font-bold text-slate-800">No messages yet</h5>
                                                <p className="text-xs text-slate-400 mt-1 max-w-xs leading-relaxed">
                                                    Send a message or attach a file to initiate the trade discussion.
                                                </p>
                                            </div>
                                        ) : (
                                            messages.map((m) => {
                                                const isMe = m.sender === userId
                                                return (
                                                    <div key={m.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                                                        <div className={`max-w-[85%] sm:max-w-[72%] rounded-2xl px-3 sm:px-4 py-2 sm:py-2.5 text-[12px] sm:text-[13px] font-medium shadow-sm ${isMe
                                                            ? "bg-blue-600 text-white rounded-tr-none"
                                                            : "bg-slate-100 text-slate-800 rounded-tl-none"
                                                            }`}>
                                                            {m.content && <p className="leading-relaxed whitespace-pre-wrap">{m.content}</p>}

                                                            {m.attachment_url && (
                                                                <div className="mt-2">
                                                                    {m.attachment_type === "image" ? (
                                                                        <div className="overflow-hidden rounded-lg border border-slate-200/50 bg-slate-50">
                                                                            <img
                                                                                src={m.attachment_url}
                                                                                alt={m.attachment_name || "Image attachment"}
                                                                                className="max-w-full max-h-60 object-cover cursor-zoom-in hover:opacity-95 transition"
                                                                                onClick={() => window.open(m.attachment_url, "_blank")}
                                                                            />
                                                                        </div>
                                                                    ) : (
                                                                        <a
                                                                            href={m.attachment_url}
                                                                            target="_blank"
                                                                            rel="noopener noreferrer"
                                                                            className={`flex items-center gap-2 p-2.5 rounded-xl border transition ${isMe
                                                                                ? "bg-blue-700/50 border-blue-500/50 text-white hover:bg-blue-700"
                                                                                : "bg-slate-200 border-slate-300 text-slate-805 hover:bg-slate-300/50"
                                                                                }`}
                                                                        >
                                                                            <FileText className={`h-5 w-5 shrink-0 ${isMe ? "text-blue-200" : "text-blue-600"}`} />
                                                                            <div className="min-w-0 flex-1 text-left">
                                                                                <p className="text-xs font-bold truncate">{m.attachment_name || "Document"}</p>
                                                                                <p className={`text-[10px] ${isMe ? "text-blue-200/80" : "text-slate-500"}`}>Click to view document</p>
                                                                            </div>
                                                                        </a>
                                                                    )}
                                                                </div>
                                                            )}

                                                            <span className={`block text-[9px] mt-1 text-right font-medium ${isMe ? "text-blue-100" : "text-slate-400"}`}>
                                                                {formatTime(m.created_at)}
                                                            </span>
                                                        </div>
                                                    </div>
                                                )
                                            })
                                        )}
                                        <div ref={messagesEndRef} />
                                    </div>

                                    {/* Message Input Box */}
                                    <form onSubmit={handleSend} className="p-2.5 sm:p-4 border-t border-slate-100 flex flex-col gap-2 sm:gap-3 relative bg-white">
                                        {/* File Attachment Preview */}
                                        {selectedFile && (
                                            <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-3 shrink-0">
                                                <div className="flex items-center gap-2 min-w-0">
                                                    {fileType === "image" && filePreview ? (
                                                        <img src={filePreview} alt="Upload preview" className="h-10 w-10 object-cover rounded-lg border border-slate-200" />
                                                    ) : fileType === "image" ? (
                                                        <Image className="h-5 w-5 text-blue-600 shrink-0" />
                                                    ) : (
                                                        <FileText className="h-5 w-5 text-blue-600 shrink-0" />
                                                    )}
                                                    <div className="min-w-0">
                                                        <p className="text-xs font-bold text-slate-800 truncate">{selectedFile.name}</p>
                                                        <p className="text-[10px] text-slate-400">{(selectedFile.size / 1024).toFixed(1)} KB</p>
                                                    </div>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={handleRemoveFile}
                                                    className="p-1 hover:bg-slate-200 rounded-full text-slate-450 hover:text-slate-600 transition"
                                                >
                                                    <X className="h-4 w-4" />
                                                </button>
                                            </div>
                                        )}

                                        {/* Emoji Drawer */}
                                        {showEmojiPicker && (
                                            <div className="absolute bottom-16 sm:bottom-20 right-2 sm:right-14 bg-white border border-slate-200 shadow-xl rounded-2xl p-2.5 sm:p-3 z-50 grid grid-cols-6 gap-1.5 sm:gap-2 w-48 sm:w-52 animate-in fade-in duration-100">
                                                {["👍", "❤️", "😊", "😂", "😮", "😢", "📦", "📄", "🔬", "🧪", "💉", "🩺"].map((emoji) => (
                                                    <button
                                                        key={emoji}
                                                        type="button"
                                                        onClick={() => handleEmojiClick(emoji)}
                                                        className="h-8 w-8 text-lg hover:bg-slate-50 rounded-lg flex items-center justify-center transition"
                                                    >
                                                        {emoji}
                                                    </button>
                                                ))}
                                            </div>
                                        )}

                                        <div className="flex gap-1.5 sm:gap-2.5 items-center w-full">
                                            <button
                                                type="button"
                                                onClick={() => fileInputRef.current?.click()}
                                                className="p-1.5 sm:p-2 hover:bg-slate-100 active:bg-slate-200 rounded-xl text-slate-500 transition shrink-0"
                                                title="Attach File"
                                            >
                                                <Paperclip className="h-4 w-4 sm:h-5 sm:w-5" />
                                            </button>
                                            <input
                                                type="file"
                                                ref={fileInputRef}
                                                className="hidden"
                                                onChange={handleFileChange}
                                                accept="image/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
                                            />

                                            <input
                                                value={newMessage}
                                                onChange={(e) => setNewMessage(e.target.value)}
                                                placeholder={`Message ${activePartner.company_name}...`}
                                                className="flex-1 px-3 sm:px-4 py-2 sm:py-2.5 border border-slate-200 rounded-xl text-xs sm:text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white text-slate-800 transition min-w-0"
                                            />

                                            <button
                                                type="button"
                                                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                                                className="p-1.5 sm:p-2 hover:bg-slate-100 active:bg-slate-200 rounded-xl text-slate-500 transition shrink-0"
                                                title="Emojis"
                                            >
                                                <Smile className="h-4 w-4 sm:h-5 sm:w-5" />
                                            </button>

                                            <button
                                                type="submit"
                                                disabled={(!newMessage.trim() && !selectedFile) || sending}
                                                className="bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 text-white font-bold p-2 sm:p-2.5 rounded-xl transition shadow-sm shrink-0"
                                            >
                                                {sending ? <Loader2 className="h-4 w-4 sm:h-4.5 sm:w-4.5 animate-spin" /> : <Send className="h-4 w-4 sm:h-4.5 sm:w-4.5" />}
                                            </button>
                                        </div>
                                    </form>
                                </>
                            ) : (
                                <div className="flex flex-col items-center justify-center p-12 text-center max-w-md mx-auto">
                                    <div className="p-4 rounded-2xl bg-blue-50 text-blue-600 mb-6">
                                        <MessageSquare className="h-8 w-8" />
                                    </div>
                                    <h3 className="text-lg font-bold text-slate-800">Your Trade Communications Inbox</h3>
                                    <p className="text-xs text-slate-500 mt-2 leading-relaxed max-w-xs">
                                        Select a conversation from the sidebar or start a new exchange to collaborate on specifications, negotiate pricing, and finalize trade agreements.
                                    </p>

                                    <div className="mt-8 w-full border-t border-slate-100 pt-6 text-left space-y-4">
                                        <div className="flex gap-3 items-start">
                                            <div className="p-2 rounded-lg bg-slate-50 text-slate-650 shrink-0">
                                                <ShieldCheck className="h-4 w-4 text-blue-600" />
                                            </div>
                                            <div>
                                                <h5 className="text-xs font-bold text-slate-800">Verified Connections</h5>
                                                <p className="text-[11px] text-slate-400 mt-0.5 font-medium">Communicate directly with registered and validated business profiles on the platform.</p>
                                            </div>
                                        </div>

                                        <div className="flex gap-3 items-start">
                                            <div className="p-2 rounded-lg bg-slate-50 text-slate-655 shrink-0">
                                                <FileText className="h-4 w-4 text-blue-600" />
                                            </div>
                                            <div>
                                                <h5 className="text-xs font-bold text-slate-800">Secure Document Exchange</h5>
                                                <p className="text-[11px] text-slate-400 mt-0.5 font-medium">Directly attach catalogs, specification sheets, and certificates to expedite agreements.</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </main>

            {userRole === "buyer" ? <BuyerFooter /> : <SupplierFooter />}

            {/* New Chat Modal */}
            {showNewChatModal && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-[2px] z-[100] flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200 w-full max-w-md mx-auto p-4 sm:p-6 shadow-2xl flex flex-col max-h-[85vh] sm:max-h-[500px]">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3 shrink-0">
                            <h3 className="text-base font-black text-slate-800">Start New Chat</h3>
                            <button
                                type="button"
                                onClick={() => setShowNewChatModal(false)}
                                className="text-slate-400 hover:text-slate-650 font-extrabold text-sm"
                            >
                                Close
                            </button>
                        </div>

                        <div className="my-3 relative shrink-0">
                            <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                            <input
                                value={searchContactQuery}
                                onChange={(e) => setSearchContactQuery(e.target.value)}
                                placeholder="Search contacts by name, username or email..."
                                className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-xs bg-slate-50 hover:bg-slate-100/50 focus:bg-white text-slate-800 transition duration-150 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                            />
                        </div>

                        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-1.5">
                            {filteredContacts.length === 0 ? (
                                <div className="text-center py-8 text-xs font-bold text-slate-450">No contacts found</div>
                            ) : (
                                filteredContacts.map((c) => (
                                    <button
                                        key={c.id}
                                        type="button"
                                        onClick={() => handleStartChat(c)}
                                        className="w-full text-left p-3 border border-transparent rounded-xl flex items-center gap-3 transition hover:bg-slate-50"
                                    >
                                        <div className="h-9 w-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-black text-xs shrink-0">
                                            <User className="h-4.5 w-4.5" />
                                        </div>
                                        <div>
                                            <p className="text-xs font-black text-slate-800 leading-tight">{c.company_name}</p>
                                            <div className="flex flex-col gap-0.5 mt-0.5">
                                                <span className="text-[9px] font-bold text-slate-400 capitalize tracking-wider">{c.role} • @{c.username}</span>
                                                {c.email && <span className="text-[9px] text-slate-400 font-medium">{c.email}</span>}
                                            </div>
                                        </div>
                                    </button>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
