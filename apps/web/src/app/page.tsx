"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, Send, Loader2, Video, Download } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

interface Clip {
  image: string;
  text: string;
  duration: number;
}

interface JobError {
  code: string;
  message: string;
}

interface Job {
  id: string;
  status: "queued" | "processing" | "completed" | "failed";
  outputUrl?: string;
  error?: JobError;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

export default function Home() {
  const [clips, setClips] = useState<Clip[]>([
    { image: "https://picsum.photos/1920/1080", text: "Hello World", duration: 3 },
  ]);
  const [callbackUrl, setCallbackUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentJob, setCurrentJob] = useState<Job | null>(null);
  const [error, setError] = useState<string | null>(null);

  const addClip = () => {
    setClips([...clips, { image: "", text: "", duration: 3 }]);
  };

  const removeClip = (index: number) => {
    if (clips.length > 1) {
      setClips(clips.filter((_, i) => i !== index));
    }
  };

  const updateClip = (index: number, field: keyof Clip, value: string | number) => {
    const newClips = [...clips];
    newClips[index] = { ...newClips[index], [field]: value };
    setClips(newClips);
  };

  const fetchJobStatus = useCallback(async (jobId: string) => {
    try {
      const res = await fetch(`${API_URL}/jobs/${jobId}`);
      if (!res.ok) throw new Error("Failed to fetch job status");
      const job: Job = await res.json();
      setCurrentJob(job);
      return job;
    } catch (err) {
      console.error("Failed to fetch job status:", err);
      return null;
    }
  }, []);

  // Poll for job status
  useEffect(() => {
    if (!currentJob) return;
    if (currentJob.status === "completed" || currentJob.status === "failed") return;

    const interval = setInterval(() => {
      fetchJobStatus(currentJob.id);
    }, 2000);

    return () => clearInterval(interval);
  }, [currentJob, fetchJobStatus]);

  const submitJob = async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      const payload: { timeline: { clips: Clip[] }; callbackUrl?: string } = {
        timeline: { clips },
      };
      if (callbackUrl) {
        payload.callbackUrl = callbackUrl;
      }

      const res = await fetch(`${API_URL}/jobs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || "Failed to submit job");
      }

      const data = await res.json();
      // Immediately fetch the job to get full status
      await fetchJobStatus(data.jobId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "queued":
        return "secondary";
      case "processing":
        return "default";
      case "completed":
        return "default";
      case "failed":
        return "destructive";
      default:
        return "outline";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent mb-3">
            🎬 Video Render Platform
          </h1>
          <p className="text-slate-400 text-lg">
            Create videos from images and text overlays using FFmpeg
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Left Panel: Create Job */}
          <Card className="bg-slate-900/50 border-slate-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Video className="h-5 w-5 text-indigo-400" />
                Create Render Job
              </CardTitle>
              <CardDescription>
                Add clips with images, text overlays, and durations
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Clips */}
              <div className="space-y-3">
                {clips.map((clip, index) => (
                  <div
                    key={index}
                    className="p-4 rounded-lg bg-slate-800/50 border border-slate-700 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wide">
                        Clip {index + 1}
                      </span>
                      {clips.length > 1 && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-slate-400 hover:text-red-400"
                          onClick={() => removeClip(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    <div className="space-y-2">
                      <div>
                        <Label className="text-xs text-slate-400">Image URL</Label>
                        <Input
                          placeholder="https://picsum.photos/1920/1080"
                          value={clip.image}
                          onChange={(e) => updateClip(index, "image", e.target.value)}
                          className="bg-slate-900 border-slate-700"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-xs text-slate-400">Text Overlay</Label>
                          <Input
                            placeholder="Enter text..."
                            value={clip.text}
                            onChange={(e) => updateClip(index, "text", e.target.value)}
                            maxLength={200}
                            className="bg-slate-900 border-slate-700"
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-slate-400">Duration (seconds)</Label>
                          <Input
                            type="number"
                            min={1}
                            max={30}
                            value={clip.duration}
                            onChange={(e) => updateClip(index, "duration", parseInt(e.target.value) || 3)}
                            className="bg-slate-900 border-slate-700"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <Button
                variant="outline"
                className="w-full border-dashed border-slate-700 text-slate-400 hover:text-white hover:border-slate-600"
                onClick={addClip}
              >
                <Plus className="h-4 w-4 mr-2" /> Add Clip
              </Button>

              {/* Callback URL */}
              <div className="pt-2">
                <Label className="text-xs text-slate-400">Callback URL (optional)</Label>
                <Input
                  placeholder="https://your-app.com/webhook"
                  value={callbackUrl}
                  onChange={(e) => setCallbackUrl(e.target.value)}
                  className="bg-slate-900 border-slate-700"
                />
              </div>

              {/* Submit Button */}
              <Button
                className="w-full bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600"
                onClick={submitJob}
                disabled={isSubmitting || clips.some((c) => !c.image)}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Submitting...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" /> Submit Render Job
                  </>
                )}
              </Button>

              {error && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                  {error}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Right Panel: Job Status */}
          <Card className="bg-slate-900/50 border-slate-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Video className="h-5 w-5 text-indigo-400" />
                Job Status
              </CardTitle>
              <CardDescription>
                Monitor your render job progress
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!currentJob ? (
                <div className="flex flex-col items-center justify-center py-16 text-slate-500">
                  <Video className="h-16 w-16 mb-4 opacity-30" />
                  <p>Submit a job to see its status here</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Job Info */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center p-3 rounded-lg bg-slate-800/50">
                      <span className="text-sm text-slate-400">Job ID</span>
                      <code className="text-sm font-mono text-slate-300">
                        {currentJob.id.slice(0, 8)}...{currentJob.id.slice(-4)}
                      </code>
                    </div>
                    <div className="flex justify-between items-center p-3 rounded-lg bg-slate-800/50">
                      <span className="text-sm text-slate-400">Status</span>
                      <Badge
                        variant={getStatusBadgeVariant(currentJob.status)}
                        className={
                          currentJob.status === "completed"
                            ? "bg-green-500/20 text-green-400 border-green-500/30"
                            : currentJob.status === "processing"
                            ? "bg-indigo-500/20 text-indigo-400 border-indigo-500/30"
                            : ""
                        }
                      >
                        {(currentJob.status === "queued" || currentJob.status === "processing") && (
                          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                        )}
                        {currentJob.status}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center p-3 rounded-lg bg-slate-800/50">
                      <span className="text-sm text-slate-400">Created</span>
                      <span className="text-sm text-slate-300">
                        {new Date(currentJob.createdAt).toLocaleTimeString()}
                      </span>
                    </div>
                    {currentJob.completedAt && (
                      <div className="flex justify-between items-center p-3 rounded-lg bg-slate-800/50">
                        <span className="text-sm text-slate-400">Completed</span>
                        <span className="text-sm text-slate-300">
                          {new Date(currentJob.completedAt).toLocaleTimeString()}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Video Player */}
                  <div className="aspect-video rounded-lg bg-slate-800 overflow-hidden">
                    {currentJob.status === "completed" && currentJob.outputUrl ? (
                      <video
                        controls
                        autoPlay
                        className="w-full h-full object-contain"
                        src={currentJob.outputUrl}
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-slate-500">
                        {currentJob.status === "processing" ? (
                          <>
                            <Loader2 className="h-12 w-12 mb-3 animate-spin opacity-50" />
                            <p>Rendering in progress...</p>
                          </>
                        ) : currentJob.status === "queued" ? (
                          <>
                            <Video className="h-12 w-12 mb-3 opacity-30" />
                            <p>Waiting in queue...</p>
                          </>
                        ) : (
                          <>
                            <Video className="h-12 w-12 mb-3 opacity-30" />
                            <p>Video will appear here</p>
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Error */}
                  {currentJob.status === "failed" && currentJob.error && (
                    <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-sm">
                      <p className="text-red-400 font-medium">Error: {currentJob.error.message}</p>
                      {currentJob.error.code && (
                        <p className="text-red-400/70 text-xs mt-1">Code: {currentJob.error.code}</p>
                      )}
                    </div>
                  )}

                  {/* Download Button */}
                  {currentJob.status === "completed" && currentJob.outputUrl && (
                    <a href={currentJob.outputUrl} download>
                      <Button variant="outline" className="w-full border-slate-700">
                        <Download className="h-4 w-4 mr-2" /> Download Video
                      </Button>
                    </a>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
