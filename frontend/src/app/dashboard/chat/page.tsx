"use client"

import { useState, useRef, useEffect } from "react"
import { useAuth } from "@/lib/auth-context"
import { useDashboard } from "@/lib/hooks"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  MessageCircle,
  Send,
  Sparkles,
  User,
  RefreshCw,
  Lightbulb,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  Loader2,
  Bot,
  Copy,
  Check,
  ThumbsUp,
  ThumbsDown,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { api } from "@/lib/api"

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: Date
  isLoading?: boolean
}

interface SuggestedPrompt {
  icon: React.ElementType
  text: string
  category: string
}

const suggestedPrompts: SuggestedPrompt[] = [
  {
    icon: TrendingUp,
    text: "What are the main strengths mentioned in my reviews?",
    category: "Insights",
  },
  {
    icon: TrendingDown,
    text: "What are the top complaints from customers?",
    category: "Pain Points",
  },
  {
    icon: Lightbulb,
    text: "Give me actionable recommendations to improve customer satisfaction",
    category: "Recommendations",
  },
  {
    icon: AlertCircle,
    text: "Are there any concerning trends I should be aware of?",
    category: "Alerts",
  },
]

export default function ChatPage() {
  const { user } = useAuth()
  const { data: dashboard, isLoading: dashboardLoading } = useDashboard()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  // Focus textarea on mount
  useEffect(() => {
    textareaRef.current?.focus()
  }, [])

  const generateContextPrompt = () => {
    if (!dashboard) return ""

    return `You are an AI assistant helping analyze product reviews for an e-commerce store. Here's the current analysis data:

Store: ${dashboard.shop_domain}
Total Reviews Analyzed: ${dashboard.review_count}
Overall Sentiment: ${dashboard.overview.avg_sentiment.toFixed(2)} (scale -1 to +1)
Positive Reviews: ${dashboard.overview.positive_pct.toFixed(1)}%
Negative Reviews: ${dashboard.overview.negative_pct.toFixed(1)}%
NPS Proxy Score: ${dashboard.nps.nps_proxy}

Top Keywords: ${dashboard.topics?.keywords?.slice(0, 10).map(k => k.keyword).join(", ") || "N/A"}

Key Aspects:
${dashboard.aspects?.slice(0, 5).map(a => `- ${a.aspect}: ${a.avg_sentiment.toFixed(2)} sentiment, ${a.mentions} mentions`).join("\n") || "N/A"}

Pain Points:
${dashboard.pain_points?.slice(0, 3).map(p => `- ${p.aspect}: ${p.negative_mentions} negative mentions`).join("\n") || "N/A"}

Recent Alerts:
${dashboard.alerts?.map(a => `- [${a.type}] ${a.message}`).join("\n") || "None"}

Sample Positive Review: "${dashboard.sample_reviews?.positive?.[0]?.text || "N/A"}"
Sample Negative Review: "${dashboard.sample_reviews?.negative?.[0]?.text || "N/A"}"

Based on this data, please provide helpful, actionable insights. Be concise and specific to this store's data.`
  }

  const sendMessage = async (content: string) => {
    if (!content.trim() || isLoading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: content.trim(),
      timestamp: new Date(),
    }

    const loadingMessage: Message = {
      id: (Date.now() + 1).toString(),
      role: "assistant",
      content: "",
      timestamp: new Date(),
      isLoading: true,
    }

    setMessages((prev) => [...prev, userMessage, loadingMessage])
    setInput("")
    setIsLoading(true)

    try {
      // Call backend chat endpoint
      const response = await api.chat(content, generateContextPrompt())

      setMessages((prev) =>
        prev.map((msg) =>
          msg.isLoading
            ? {
                ...msg,
                content: response.response,
                isLoading: false,
              }
            : msg
        )
      )
    } catch (error) {
      console.error("Chat error:", error)
      setMessages((prev) =>
        prev.map((msg) =>
          msg.isLoading
            ? {
                ...msg,
                content:
                  "I apologize, but I encountered an error processing your request. Please try again or check if the Claude API is properly configured.",
                isLoading: false,
              }
            : msg
        )
      )
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    sendMessage(input)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      sendMessage(input)
    }
  }

  const copyToClipboard = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  if (dashboardLoading) {
    return <ChatSkeleton />
  }

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      {/* Header */}
      <div className="flex-shrink-0 mb-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <MessageCircle className="h-6 w-6 text-primary" />
              AI Review Insights
            </h1>
            <p className="text-muted-foreground">
              Ask questions about your reviews and get AI-powered insights
            </p>
          </div>
          <Badge variant="outline" className="flex items-center gap-1">
            <Sparkles className="h-3 w-3" />
            Powered by Claude
          </Badge>
        </div>
      </div>

      {/* Chat Container */}
      <Card className="flex-1 flex flex-col overflow-hidden">
        <CardHeader className="flex-shrink-0 pb-3 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <Avatar className="h-10 w-10 bg-gradient-to-br from-violet-500 to-purple-600">
                  <AvatarFallback className="bg-transparent text-white">
                    <Bot className="h-5 w-5" />
                  </AvatarFallback>
                </Avatar>
                <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full" />
              </div>
              <div>
                <CardTitle className="text-base">Review Analysis Assistant</CardTitle>
                <CardDescription className="text-xs">
                  {dashboard
                    ? `Analyzing ${dashboard.review_count.toLocaleString()} reviews from ${dashboard.shop_domain}`
                    : "Ready to help"}
                </CardDescription>
              </div>
            </div>
            {messages.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setMessages([])}
                className="text-muted-foreground"
              >
                <RefreshCw className="h-4 w-4 mr-1" />
                Clear
              </Button>
            )}
          </div>
        </CardHeader>

        {/* Messages */}
        <CardContent className="flex-1 overflow-hidden p-0">
          <ScrollArea className="h-full p-4" ref={scrollRef}>
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full py-8">
                <div className="bg-gradient-to-br from-violet-100 to-purple-100 dark:from-violet-900/20 dark:to-purple-900/20 p-4 rounded-full mb-4">
                  <Sparkles className="h-8 w-8 text-violet-600" />
                </div>
                <h3 className="text-lg font-semibold mb-2">How can I help you today?</h3>
                <p className="text-muted-foreground text-center max-w-md mb-6">
                  Ask me anything about your reviews. I can help identify trends, pain points,
                  and provide actionable recommendations.
                </p>

                {/* Suggested Prompts */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full max-w-2xl">
                  {suggestedPrompts.map((prompt, index) => (
                    <button
                      key={index}
                      onClick={() => sendMessage(prompt.text)}
                      className="flex items-start gap-3 p-4 text-left rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                    >
                      <div className="p-2 rounded-md bg-primary/10">
                        <prompt.icon className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">{prompt.category}</p>
                        <p className="text-sm font-medium">{prompt.text}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={cn(
                      "flex gap-3",
                      message.role === "user" ? "justify-end" : "justify-start"
                    )}
                  >
                    {message.role === "assistant" && (
                      <Avatar className="h-8 w-8 flex-shrink-0 bg-gradient-to-br from-violet-500 to-purple-600">
                        <AvatarFallback className="bg-transparent text-white text-xs">
                          <Bot className="h-4 w-4" />
                        </AvatarFallback>
                      </Avatar>
                    )}

                    <div
                      className={cn(
                        "max-w-[80%] rounded-2xl px-4 py-3",
                        message.role === "user"
                          ? "bg-primary text-primary-foreground rounded-br-md"
                          : "bg-muted rounded-bl-md"
                      )}
                    >
                      {message.isLoading ? (
                        <div className="flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span className="text-sm">Analyzing your reviews...</span>
                        </div>
                      ) : (
                        <>
                          <div className="text-sm whitespace-pre-wrap">{message.content}</div>
                          {message.role === "assistant" && (
                            <div className="flex items-center gap-2 mt-2 pt-2 border-t border-border/50">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2 text-xs"
                                onClick={() => copyToClipboard(message.content, message.id)}
                              >
                                {copiedId === message.id ? (
                                  <Check className="h-3 w-3 mr-1" />
                                ) : (
                                  <Copy className="h-3 w-3 mr-1" />
                                )}
                                {copiedId === message.id ? "Copied" : "Copy"}
                              </Button>
                              <Button variant="ghost" size="sm" className="h-7 px-2 text-xs">
                                <ThumbsUp className="h-3 w-3" />
                              </Button>
                              <Button variant="ghost" size="sm" className="h-7 px-2 text-xs">
                                <ThumbsDown className="h-3 w-3" />
                              </Button>
                            </div>
                          )}
                        </>
                      )}
                    </div>

                    {message.role === "user" && (
                      <Avatar className="h-8 w-8 flex-shrink-0">
                        <AvatarFallback className="bg-primary/10 text-primary text-xs">
                          <User className="h-4 w-4" />
                        </AvatarFallback>
                      </Avatar>
                    )}
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>

        {/* Input Area */}
        <div className="flex-shrink-0 p-4 border-t bg-muted/30">
          <form onSubmit={handleSubmit} className="flex gap-3">
            <div className="flex-1 relative">
              <Textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about your reviews... (Press Enter to send)"
                className="min-h-[52px] max-h-32 resize-none pr-12"
                disabled={isLoading}
              />
              <Button
                type="submit"
                size="icon"
                disabled={!input.trim() || isLoading}
                className="absolute right-2 bottom-2 h-8 w-8"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </form>
          <p className="text-xs text-muted-foreground mt-2 text-center">
            AI responses are based on your review data. Results may vary.
          </p>
        </div>
      </Card>
    </div>
  )
}

function ChatSkeleton() {
  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      <div className="mb-4">
        <Skeleton className="h-8 w-64 mb-2" />
        <Skeleton className="h-4 w-96" />
      </div>
      <Skeleton className="flex-1 rounded-lg" />
    </div>
  )
}
