"use client"

import React, { useState, useCallback, useMemo } from "react"
import { useDropzone, FileRejection } from "react-dropzone"
import { UploadCloud, File, X, AlertCircle, CheckCircle2, FileText, ScanSearch, Loader2 } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"

function formatBytes(bytes: number, decimals = 2) {
  if (!+bytes) return '0 Bytes'
  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`
}

export interface UploadInterfaceProps {
  maxSize?: number;
  accept?: Record<string, string[]>;
  onScan?: (data: { type: "file" | "text", payload: File | string }) => void;
  isProcessing?: boolean;
  progress?: number;
  progressLabel?: string;
  buttonLabel?: string;
  buttonIcon?: React.ReactNode;
}

export function UploadInterface({
  maxSize = 10 * 1024 * 1024,
  accept = {
    "application/pdf": [".pdf"],
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
    "text/plain": [".txt"],
  },
  onScan,
  isProcessing = false,
  progress = 0,
  progressLabel = "Analyzing content...",
  buttonLabel = "Start Analysis",
  buttonIcon = <ScanSearch className="w-5 h-5 mr-2" />,
}: UploadInterfaceProps) {
  const [activeTab, setActiveTab] = useState<"upload" | "paste">("upload")
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [text, setText] = useState("")
  const [uploadProgress, setUploadProgress] = useState<number | null>(null)

  // Internal simulated scanning if `onScan` is not provided (for dummy usage)
  const [internalScanning, setInternalScanning] = useState(false)
  const [internalProgress, setInternalProgress] = useState(0)

  const activeIsScanning = isProcessing || internalScanning
  const activeProgress = isProcessing ? progress : internalProgress

  const onDrop = useCallback((acceptedFiles: File[], fileRejections: FileRejection[]) => {
    setError(null)
    if (fileRejections.length > 0) {
      const rejection = fileRejections[0]
      if (rejection.errors[0]?.code === "file-too-large") {
        setError(`File is too large. Maximum size is ${formatBytes(maxSize)}.`)
      } else if (rejection.errors[0]?.code === "file-invalid-type") {
        setError("Invalid file type. Please upload a supported file format.")
      } else {
        setError(rejection.errors[0]?.message || "An error occurred during upload.")
      }
      return
    }

    if (acceptedFiles.length > 0) {
      // Simulate file upload progress
      setUploadProgress(0)
      let currentProgress = 0
      const interval = setInterval(() => {
        currentProgress += 15
        if (currentProgress >= 100) {
          clearInterval(interval)
          setUploadProgress(null)
          setFile(acceptedFiles[0])
        } else {
          setUploadProgress(currentProgress)
        }
      }, 100)
    }
  }, [maxSize])

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    maxFiles: 1,
    maxSize,
    accept,
  })

  const fileWordEstimate = useMemo(() => {
    if (!file) return 0
    return Math.floor(file.size / 15)
  }, [file])

  const textWordCount = useMemo(() => {
    return text.trim() ? text.trim().split(/\s+/).length : 0
  }, [text])

  const textCharCount = text.length

  const handleAction = () => {
    if ((activeTab === "upload" && !file) || (activeTab === "paste" && text.length === 0)) return
    
    if (onScan) {
      onScan({ type: activeTab === "upload" ? "file" : "text", payload: activeTab === "upload" ? file! : text })
    } else {
      // Internal dummy simulation
      setInternalScanning(true)
      setInternalProgress(0)
      const interval = setInterval(() => {
        setInternalProgress(prev => {
          if (prev >= 100) {
            clearInterval(interval)
            setTimeout(() => setInternalScanning(false), 500)
            return 100
          }
          return prev + 10
        })
      }, 200)
    }
  }

  const removeFile = (e: React.MouseEvent) => {
    e.stopPropagation()
    setFile(null)
    setError(null)
    setUploadProgress(null)
  }

  return (
    <Card className="w-full max-w-4xl mx-auto shadow-sm border-muted/60">
      <CardContent className="p-6 sm:p-8">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-8 h-12">
            <TabsTrigger value="upload" className="text-sm font-medium h-full">File Upload</TabsTrigger>
            <TabsTrigger value="paste" className="text-sm font-medium h-full">Paste Text</TabsTrigger>
          </TabsList>

          <TabsContent value="upload" className="space-y-4 outline-none min-h-[280px]">
            <AnimatePresence mode="wait">
              {uploadProgress !== null ? (
                <motion.div
                  key="uploading"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed border-primary/30 bg-primary/5 rounded-xl"
                >
                  <div className="flex flex-col items-center gap-4 w-full max-w-xs px-4">
                     <div className="p-3 bg-primary/10 text-primary rounded-full animate-pulse">
                        <UploadCloud className="w-8 h-8" />
                     </div>
                     <div className="w-full space-y-2 text-center">
                        <div className="flex justify-between text-xs font-medium text-primary">
                          <span>Uploading file...</span>
                          <span>{uploadProgress}%</span>
                        </div>
                        <Progress value={uploadProgress} className="h-2" />
                     </div>
                  </div>
                </motion.div>
              ) : !file ? (
                <motion.div
                  key="dropzone"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="outline-none"
                >
                  <div
                    {...getRootProps()}
                    className={cn(
                      "flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-xl cursor-pointer transition-all duration-300 outline-none relative overflow-hidden group",
                      isDragActive ? "border-primary bg-primary/5 scale-[1.01]" : "border-muted-foreground/25 hover:bg-muted/30 hover:border-muted-foreground/50",
                      isDragReject && "border-destructive bg-destructive/5 scale-[1.01]",
                      error && "border-destructive/50"
                    )}
                  >
                    <input {...getInputProps()} />
                    
                    <div className="flex flex-col items-center justify-center pt-5 pb-6 text-center px-4 z-10">
                      <motion.div 
                        animate={{ 
                          scale: isDragActive ? 1.1 : 1,
                          rotate: isDragReject ? -10 : isDragActive ? 10 : 0,
                          color: isDragReject ? "hsl(var(--destructive))" : isDragActive ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))"
                        }}
                        transition={{ type: "spring", stiffness: 300, damping: 20 }}
                        className={cn(
                          "p-4 rounded-full mb-4 transition-colors",
                          isDragActive ? "bg-primary/10" : "bg-muted/50 group-hover:bg-muted"
                        )}
                      >
                        <UploadCloud className="w-8 h-8" />
                      </motion.div>
                      <p className="mb-2 text-sm font-medium">
                        {isDragReject ? (
                          <span className="font-semibold text-destructive">File type not supported</span>
                        ) : isDragActive ? (
                          <span className="font-semibold text-primary">Drop file here</span>
                        ) : (
                          <><span className="font-semibold text-primary">Click to upload</span> or drag and drop</>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Supports PDF, DOCX, and TXT up to {formatBytes(maxSize)}
                      </p>
                    </div>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="file-preview"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="h-64 flex flex-col justify-center"
                >
                  <div className="flex items-start p-6 border rounded-xl bg-card shadow-sm relative group max-w-2xl mx-auto w-full">
                    <div className="p-4 bg-primary/10 text-primary rounded-xl mr-5">
                      <FileText className="w-8 h-8" />
                    </div>
                    <div className="flex-1 min-w-0 pr-8">
                      <p className="text-base font-medium text-foreground truncate mb-2">
                        {file.name}
                      </p>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1.5"><File className="w-4 h-4"/> {formatBytes(file.size)}</span>
                        <span>•</span>
                        <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-emerald-500"/> Ready to scan</span>
                      </div>
                      <div className="mt-4 pt-4 border-t flex items-center justify-between text-xs text-muted-foreground">
                        <span>Est. Word Count</span>
                        <span className="font-medium text-foreground">~{fileWordEstimate.toLocaleString()} words</span>
                      </div>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="absolute top-4 right-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity hover:text-destructive hover:bg-destructive/10"
                      onClick={removeFile}
                    >
                      <X className="w-5 h-5" />
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded-lg mt-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <p>{error}</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </TabsContent>

          <TabsContent value="paste" className="outline-none min-h-[280px]">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              <Textarea
                placeholder="Paste your text here to analyze..."
                className="min-h-[250px] resize-y p-5 text-base leading-relaxed bg-muted/20 border-muted-foreground/20 focus-visible:ring-primary/50"
                value={text}
                onChange={(e) => setText(e.target.value)}
              />
              <div className="flex items-center justify-between px-2 text-sm text-muted-foreground font-medium">
                <div className="flex items-center gap-6">
                  <span className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-primary/50" />
                    {textWordCount.toLocaleString()} words
                  </span>
                  <span className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-primary/50" />
                    {textCharCount.toLocaleString()} characters
                  </span>
                </div>
                {textCharCount > 50000 && (
                  <span className="text-amber-500 flex items-center gap-1.5 bg-amber-500/10 px-2 py-1 rounded-md text-xs">
                    <AlertCircle className="w-3.5 h-3.5" /> Large text might take longer
                  </span>
                )}
              </div>
            </motion.div>
          </TabsContent>
        </Tabs>

        <div className="mt-8 pt-8 border-t flex flex-col gap-6">
          <AnimatePresence>
            {activeIsScanning && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-3 overflow-hidden"
              >
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground font-medium flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-primary" />
                    {progressLabel}
                  </span>
                  <span className="font-bold text-primary">{activeProgress}%</span>
                </div>
                <Progress value={activeProgress} className="h-2.5 bg-primary/10" />
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex justify-end">
            <Button 
              size="lg" 
              className="w-full sm:w-auto h-12 px-8 text-base shadow-sm transition-all"
              disabled={activeIsScanning || (activeTab === "upload" && !file) || (activeTab === "paste" && text.length === 0) || uploadProgress !== null}
              onClick={handleAction}
            >
              {activeIsScanning ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  {buttonIcon}
                  {buttonLabel}
                </>
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
