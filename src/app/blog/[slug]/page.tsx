'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useParams, notFound } from 'next/navigation';
import { 
  ArrowLeft, 
  Calendar, 
  Clock, 
  Tag, 
  Share2, 
  Sparkles, 
  ChevronRight, 
  CheckCircle2, 
  AlertCircle,
  Copy,
  Check,
  Send,
  Loader2
} from 'lucide-react';
import { Navbar } from '@/components/public/Navbar';
import { Footer } from '@/components/public/Footer';
import { BLOG_POSTS, BlogPost } from '@/lib/blog-data';

export default function BlogPostPage() {
  const params = useParams();
  const slug = params?.slug as string;
  const post = BLOG_POSTS.find((p) => p.slug === slug);

  const [copied, setCopied] = useState(false);
  const [askQuery, setAskQuery] = useState('');
  const [askLoading, setAskLoading] = useState(false);
  const [askResponse, setAskResponse] = useState<string | null>(null);

  if (!post) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
        <Navbar transparent={false} />
        <div className="text-center py-40 max-w-md mx-auto px-4">
          <h1 className="text-3xl font-black text-gray-900 mb-3">Guide Not Found</h1>
          <p className="text-gray-600 text-sm mb-6">The tutorial or how-to guide you requested does not exist or has been moved.</p>
          <Link href="/blog" className="px-6 py-3 bg-primary-600 text-white font-bold rounded-xl text-sm">
            Back to All Guides
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  const relatedPosts = BLOG_POSTS.filter((p) => p.slug !== slug).slice(0, 2);

  const copyLink = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleAskArticleAi = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!askQuery.trim()) return;

    setAskLoading(true);
    setAskResponse(null);

    try {
      const res = await fetch('/api/help/ai-query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: `${askQuery} (Context: ${post.title})` })
      });
      const data = await res.json();
      if (data.success && data.data) {
        setAskResponse(data.data.answer);
      }
    } catch {
      setAskResponse('Unable to answer right now. Please reach out to support@vtstack.ng.');
    } finally {
      setAskLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-gray-900 selection:bg-primary-100 selection:text-primary-900">
      <Navbar transparent={false} />

      {/* Article Header */}
      <header className="pt-36 pb-14 bg-white border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 mb-6">
            <Link 
              href="/blog" 
              className="text-xs font-bold text-gray-500 hover:text-primary-600 flex items-center gap-1.5 transition-colors"
            >
              <ArrowLeft size={14} /> Back to Guides
            </Link>
            <span className="text-gray-300">/</span>
            <span className="text-xs font-bold text-primary-600 px-2.5 py-0.5 rounded-full bg-primary-50">
              {post.category}
            </span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-gray-900 tracking-tight leading-tight mb-6">
            {post.title}
          </h1>

          <p className="text-lg text-gray-600 leading-relaxed mb-8">
            {post.excerpt}
          </p>

          <div className="flex flex-wrap items-center justify-between gap-4 pt-6 border-t border-gray-100">
            <div className="flex items-center gap-3">
              <img 
                src={post.author.avatar} 
                alt={post.author.name} 
                className="w-10 h-10 rounded-full object-cover border border-gray-100" 
              />
              <div>
                <p className="text-sm font-bold text-gray-900">{post.author.name}</p>
                <p className="text-xs text-gray-500">{post.author.role}</p>
              </div>
            </div>

            <div className="flex items-center gap-4 text-xs text-gray-500">
              <span className="flex items-center gap-1.5">
                <Calendar size={14} /> {post.publishedAt}
              </span>
              <span className="flex items-center gap-1.5">
                <Clock size={14} /> {post.readTime}
              </span>
              <button 
                onClick={copyLink}
                className="flex items-center gap-1.5 text-primary-600 font-bold hover:text-primary-700 bg-primary-50 px-3 py-1 rounded-lg transition-colors"
              >
                {copied ? <Check size={14} /> : <Share2 size={14} />}
                {copied ? 'Copied Link' : 'Share'}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Article Body */}
      <main className="py-16 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-3xl p-8 sm:p-12 border border-gray-100 shadow-sm leading-relaxed prose prose-slate max-w-none prose-headings:font-black prose-headings:tracking-tight prose-a:text-primary-600 hover:prose-a:text-primary-700 prose-pre:bg-gray-950 prose-pre:border prose-pre:border-gray-800 prose-pre:rounded-2xl">
          {/* Custom Markdown-like parser formatting */}
          {post.content.split('\n\n').map((block, idx) => {
            const trimmed = block.trim();
            if (!trimmed) return null;

            if (trimmed.startsWith('# ')) {
              return null; // Handled in header
            }
            if (trimmed.startsWith('## ')) {
              return (
                <h2 key={idx} className="text-2xl font-black text-gray-900 mt-10 mb-4 pb-2 border-b border-gray-100">
                  {trimmed.replace('## ', '')}
                </h2>
              );
            }
            if (trimmed.startsWith('### ')) {
              return (
                <h3 key={idx} className="text-lg font-bold text-gray-900 mt-6 mb-2">
                  {trimmed.replace('### ', '')}
                </h3>
              );
            }
            if (trimmed.startsWith('> ')) {
              return (
                <div key={idx} className="my-6 p-4 rounded-2xl bg-amber-50 border-l-4 border-amber-500 text-amber-900 text-sm leading-relaxed flex items-start gap-3">
                  <AlertCircle size={18} className="shrink-0 text-amber-600 mt-0.5" />
                  <div>{trimmed.replace('> ', '')}</div>
                </div>
              );
            }
            if (trimmed.startsWith('```')) {
              const lines = trimmed.split('\n');
              const code = lines.slice(1, -1).join('\n');
              return (
                <div key={idx} className="my-6 rounded-2xl overflow-hidden bg-gray-950 border border-gray-800 text-xs font-mono">
                  <div className="bg-gray-900 px-4 py-2 text-gray-400 text-[11px] font-bold border-b border-gray-800 flex items-center justify-between">
                    <span>CODE SNIPPET</span>
                    <button 
                      onClick={() => navigator.clipboard.writeText(code)}
                      className="hover:text-white transition-colors"
                    >
                      <Copy size={13} />
                    </button>
                  </div>
                  <pre className="p-4 text-emerald-400 overflow-x-auto leading-relaxed">
                    <code>{code}</code>
                  </pre>
                </div>
              );
            }
            if (trimmed.startsWith('- ') || trimmed.startsWith('1. ')) {
              const items = trimmed.split('\n');
              return (
                <ul key={idx} className="my-4 space-y-2 list-none pl-0">
                  {items.map((it, itemIdx) => (
                    <li key={itemIdx} className="flex items-start gap-2.5 text-sm text-gray-700">
                      <CheckCircle2 size={16} className="text-primary-600 shrink-0 mt-0.5" />
                      <span>{it.replace(/^[-*]\s+|\d+\.\s+/, '')}</span>
                    </li>
                  ))}
                </ul>
              );
            }

            return (
              <p key={idx} className="text-gray-700 text-base leading-relaxed my-4">
                {trimmed}
              </p>
            );
          })}
        </div>

        {/* Ask AI Contextual Widget */}
        <div className="mt-12 bg-white rounded-3xl p-6 sm:p-8 border-2 border-primary-100 shadow-lg shadow-primary-500/5">
          <div className="flex items-center gap-2 mb-2">
            <span className="p-1.5 bg-primary-100 text-primary-700 rounded-lg">
              <Sparkles size={16} />
            </span>
            <h3 className="font-bold text-gray-900 text-base">Have a question about this guide?</h3>
          </div>
          <p className="text-xs text-gray-500 mb-4">
            Ask our AI assistant for clarification on requirements, code examples, or troubleshooting steps.
          </p>

          <form onSubmit={handleAskArticleAi} className="flex items-center gap-2">
            <input
              type="text"
              placeholder="e.g. Can I use NIN instead of BVN for virtual accounts?"
              value={askQuery}
              onChange={(e) => setAskQuery(e.target.value)}
              className="w-full py-2.5 px-4 bg-slate-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary-500"
            />
            <button
              type="submit"
              disabled={askLoading || !askQuery.trim()}
              className="px-5 py-2.5 bg-gray-900 hover:bg-primary-600 text-white font-bold text-xs rounded-xl transition-all duration-200 flex items-center gap-1.5 shrink-0 disabled:opacity-50"
            >
              {askLoading ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
              <span>Ask</span>
            </button>
          </form>

          {askResponse && (
            <div className="mt-4 p-4 rounded-xl bg-primary-50/60 border border-primary-200 text-xs text-gray-800 leading-relaxed animate-in fade-in">
              <span className="font-bold text-primary-800 block mb-1">AI Answer:</span>
              {askResponse}
            </div>
          )}
        </div>

        {/* Related Articles */}
        <div className="mt-16">
          <h3 className="text-xl font-black text-gray-900 mb-6">Continue Your Learning Journey</h3>
          <div className="grid sm:grid-cols-2 gap-6">
            {relatedPosts.map((rel) => (
              <Link
                key={rel.slug}
                href={`/blog/${rel.slug}`}
                className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-primary-200 transition-all group flex flex-col justify-between"
              >
                <div>
                  <span className="text-[11px] font-bold text-primary-600 uppercase tracking-wider mb-2 block">
                    {rel.category}
                  </span>
                  <h4 className="font-bold text-gray-900 text-base group-hover:text-primary-600 transition-colors line-clamp-2">
                    {rel.title}
                  </h4>
                  <p className="text-xs text-gray-500 mt-2 line-clamp-2">{rel.excerpt}</p>
                </div>
                <div className="mt-4 flex items-center gap-1 text-xs font-bold text-primary-600 group-hover:translate-x-1 transition-transform">
                  <span>Read Guide</span>
                  <ChevronRight size={14} />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
