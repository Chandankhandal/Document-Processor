"use client";

import React, { useState, useEffect } from 'react';
import { Upload, FileText, CheckCircle, Clock, Edit3, X, Download, RotateCcw, Search, Filter, ArrowUpDown } from 'lucide-react';
import { documentService } from './services/api';
import { DocumentJob } from './types';

export default function Dashboard() {
  const [jobs, setJobs] = useState<DocumentJob[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [editingJob, setEditingJob] = useState<DocumentJob | null>(null);

  // Requirement #7: Filter and Sort States
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [sortBy, setSortBy] = useState("Newest");

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    try {
      setIsUploading(true);
      for (let i = 0; i < files.length; i++) {
        const newJob = await documentService.uploadDocument(files[i]);
        setJobs(prev => [newJob, ...prev]);
      }
    } catch (error) {
      console.error("Upload failed:", error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleRetry = async (docId: number) => {
    try {
      await documentService.retryJob(docId);
      setJobs(prev => prev.map(j => j.id === docId ? { ...j, status: 'Queued', progress: 0 } : j));
    } catch (error) {
      console.error("Retry failed:", error);
    }
  };

  useEffect(() => {
    const pollInterval = setInterval(async () => {
      const unfinishedJobs = jobs.filter(j => j.status !== 'Completed' && j.status !== 'Failed');
      if (unfinishedJobs.length === 0) return;

      for (const job of unfinishedJobs) {
        try {
          const progressInfo = await documentService.getLiveProgress(job.id);
          const statusInfo = await documentService.getJobStatus(job.id);
          setJobs(prevJobs =>
            prevJobs.map(j =>
              j.id === job.id
                ? { ...j, status: statusInfo.status, progress: progressInfo.progress || 0, result: statusInfo.result } as any
                : j
            )
          );
        } catch (err) {
          console.error("Polling failed", job.id);
        }
      }
    }, 3000);
    return () => clearInterval(pollInterval);
  }, [jobs]);

  // FEATURE: Corrected Filtering & Sorting Logic 
  const filteredJobs = jobs
    .filter(job => {
      const matchesSearch = job.filename.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === "All" || job.status === statusFilter;
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      if (sortBy === "Newest") return b.id - a.id;
      if (sortBy === "Oldest") return a.id - b.id;
      return 0;
    });

  return (
    <div className="min-h-screen bg-slate-50 p-10 font-sans text-slate-900">
      <div className="max-w-4xl mx-auto">
        <header className="flex justify-between items-center mb-12">
          <div>
            <h1 className="text-4xl font-extrabold tracking-tight">Document Engine</h1>
            <p className="text-slate-500 mt-2">Upload and manage documents in real-time.</p>
          </div>
          <label className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-2xl cursor-pointer flex items-center gap-3 shadow-xl transition-all">
            <Upload size={22} />
            {isUploading ? "Uploading..." : "New Documents"}
            <input type="file" multiple className="hidden" onChange={handleFileUpload} disabled={isUploading} />
          </label>
        </header>

        {/* FEATURE: Search, Filter, and Sort UI */}
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="relative grow">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input
              type="text"
              placeholder="Search documents..."
              className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex gap-2">
            <select
              className="px-4 py-4 bg-white border border-slate-200 rounded-2xl outline-none font-semibold text-slate-600 shadow-sm"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="All">All Status</option>
              <option value="Queued">Queued</option>
              <option value="Processing">Processing</option>
              <option value="Completed">Completed</option>
              <option value="Failed">Failed</option>
            </select>

            <select
              className="px-4 py-4 bg-white border border-slate-200 rounded-2xl outline-none font-semibold text-slate-600 shadow-sm"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              <option value="Newest">Newest</option>
              <option value="Oldest">Oldest</option>
            </select>
          </div>
        </div>

        <div className="space-y-4">
          {filteredJobs.length === 0 && (
            <div className="bg-white border-2 border-dashed border-slate-200 rounded-3xl p-20 text-center text-slate-400">
              No matching documents found.
            </div>
          )}

          {filteredJobs.map((job) => (
            <div key={job.id} className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex items-center justify-between hover:border-indigo-200 transition-all">
              <div className="flex items-center gap-5">
                <div className={`p-4 rounded-2xl ${job.status === 'Failed' ? 'bg-red-50 text-red-600' : 'bg-indigo-50 text-indigo-600'}`}>
                  <FileText size={28} />
                </div>
                <div>
                  <h3 className="font-bold text-lg">{job.filename}</h3>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">ID: {job.id}</span>
                </div>
              </div>

              <div className="flex items-center gap-8">
                <div className="w-40 text-right">
                  <div className="flex justify-between text-xs font-bold mb-2">
                    <span className={`uppercase ${job.status === 'Failed' ? 'text-red-600' : 'text-indigo-600'}`}>{job.status}</span>
                    <span className="text-slate-400">{(job as any).progress || 0}%</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-700 ${job.status === 'Failed' ? 'bg-red-500' : 'bg-indigo-600'}`}
                      style={{ width: `${(job as any).progress || 0}%` }}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {job.status === "Failed" && (
                    <button onClick={() => handleRetry(job.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-xl">
                      <RotateCcw size={20} />
                    </button>
                  )}

                  {/* FEATURE: Export Options */}
                  {job.status === "Completed" && (
                    <>
                      <button onClick={() => documentService.exportToJson(job)} className="p-2 text-slate-400 hover:text-indigo-600" title="JSON">
                        <Download size={20} />
                      </button>
                      <button onClick={() => documentService.exportToCsv(job)} className="p-2 text-slate-400 hover:text-emerald-600" title="CSV">
                        <FileText size={20} />
                      </button>
                    </>
                  )}

                  {job.status === "Completed" ? (
                    <button onClick={() => setEditingJob(job)} className="p-2 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-100">
                      <Edit3 size={24} />
                    </button>
                  ) : (
                    job.status !== "Failed" && <Clock className="text-indigo-400 animate-pulse" size={24} />
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* EDIT MODAL */}
        {editingJob && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-6 z-50">
            <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl p-8 relative animate-in zoom-in duration-200">
              <button onClick={() => setEditingJob(null)} className="absolute top-6 right-6 text-slate-400 hover:text-slate-600">
                <X size={24} />
              </button>
              <h2 className="text-2xl font-bold mb-6">Review & Finalize</h2>
              <div className="space-y-5">
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Document Title</label>
                  <input
                    type="text"
                    className="w-full mt-2 p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                    value={editingJob.result?.title || ""}
                    readOnly
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Summary</label>
                  <textarea
                    className="w-full mt-2 p-3 bg-slate-50 border border-slate-200 rounded-xl h-32 outline-none focus:ring-2 focus:ring-indigo-500"
                    value={editingJob.result?.summary || ""}
                    onChange={(e) => setEditingJob({ ...editingJob, result: { ...editingJob.result, summary: e.target.value } })}
                  />
                </div>
                <button
                  onClick={async () => {
                    await documentService.updateResult(editingJob.id, editingJob.result);
                    setJobs(jobs.map(j => j.id === editingJob.id ? editingJob : j));
                    setEditingJob(null);
                  }}
                  className="w-full bg-indigo-600 text-white font-bold py-4 rounded-2xl shadow-lg hover:bg-indigo-700 transition-all"
                >
                  Save and Finalize
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}