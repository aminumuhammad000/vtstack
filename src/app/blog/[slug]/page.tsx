'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { 
  ArrowLeft, 
  Calendar, 
  Clock, 
  Share2, 
  ChevronRight, 
  CheckCircle2, 
  AlertCircle,
  Copy,
  Check,
  Mail,
  Phone
} from 'lucide-react';
import { Navbar } from '@/components/public/Navbar';
import { Footer } from '@/components/public/Footer';
import { BLOG_POSTS, BlogPost } from '@/lib/blog-data';

function renderCleanInline(text: string): React.ReactNode {
  // Clean raw markers
  const cleaned = text.replace(/^#+\s*/g, '').replace(/---/g, '');
  
  const parts: React.ReactNode[] = [];
  const regex = /(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^)]+\)|https?:\/\/[^\s)]+)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(cleaned)) !== null) {
    if (match.index > lastIndex) {
      const plain = cleaned.substring(lastIndex, match.index).replace(/\*\*/g, '').replace(/#+/g, '');
      parts.push(plain);
    }

    const token = match[0];
    if (token.startsWith('**') && token.endsWith('**')) {
      const boldText = token.slice(2, -2).replace(/\*\*/g, '');
      parts.push(<strong key={match.index} className="font-bold text-gray-900">{boldText}</strong>);
    } else if (token.startsWith('`') && token.endsWith('`')) {
      const codeText = token.slice(1, -1);
      parts.push(<code key={match.index} className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-800 text-xs font-mono font-medium">{codeText}</code>);
    } else if (token.startsWith('[') && token.includes('](')) {
      const linkMatch = token.match(/\[([^\]]+)\]\(([^)]+)\)/);
      if (linkMatch) {
        parts.push(
          <a key={match.index} href={linkMatch[2]} target={linkMatch[2].startsWith('http') ? '_blank' : '_self'} rel="noopener noreferrer" className="text-primary-600 font-semibold hover:underline">
            {linkMatch[1]}
          </a>
        );
      } else {
        parts.push(token);
      }
    } else if (token.startsWith('http')) {
      parts.push(
        <a key={match.index} href={token} target="_blank" rel="noopener noreferrer" className="text-primary-600 font-semibold hover:underline">
          {token}
        </a>
      );
    }
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < cleaned.length) {
    const trailing = cleaned.substring(lastIndex).replace(/\*\*/g, '').replace(/#+/g, '');
    parts.push(trailing);
  }

  return parts;
}

export default function BlogPostPage() {
  const params = useParams();
  const slug = params?.slug as string;
  const post = BLOG_POSTS.find((p) => p.slug === slug);

  const [copied, setCopied] = useState(false);

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
        <div className="bg-white rounded-3xl p-8 sm:p-12 border border-gray-100 shadow-sm leading-relaxed">
          {post.content.split('\n\n').map((block, idx) => {
            const trimmed = block.trim();
            if (!trimmed || trimmed === '---') return null;

            // Heading 1 - ignored as it is in header
            if (trimmed.startsWith('# ')) {
              return null;
            }

            // Heading 2
            if (trimmed.startsWith('## ')) {
              const text = trimmed.replace(/^##\s+/, '').replace(/\*\*/g, '');
              return (
                <h2 key={idx} className="text-2xl font-black text-gray-900 mt-10 mb-4 pb-2 border-b border-gray-100">
                  {text}
                </h2>
              );
            }

            // Heading 3
            if (trimmed.startsWith('### ')) {
              const text = trimmed.replace(/^###\s+/, '').replace(/\*\*/g, '');
              return (
                <h3 key={idx} className="text-lg font-bold text-gray-900 mt-6 mb-3">
                  {text}
                </h3>
              );
            }

            // Callout Box
            if (trimmed.startsWith('> ')) {
              const callout = trimmed.replace(/^>\s+/, '');
              return (
                <div key={idx} className="my-6 p-4 rounded-2xl bg-amber-50 border-l-4 border-amber-500 text-amber-900 text-sm leading-relaxed flex items-start gap-3">
                  <AlertCircle size={18} className="shrink-0 text-amber-600 mt-0.5" />
                  <div>{renderCleanInline(callout)}</div>
                </div>
              );
            }

            // Code Block
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
                      title="Copy code"
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

            // List Items
            if (trimmed.startsWith('- ') || /^\d+\.\s+/.test(trimmed)) {
              const items = trimmed.split('\n');
              return (
                <ul key={idx} className="my-4 space-y-2.5 list-none pl-0">
                  {items.map((it, itemIdx) => {
                    const cleanItem = it.replace(/^[-*]\s+|\d+\.\s+/, '');
                    return (
                      <li key={itemIdx} className="flex items-start gap-2.5 text-sm text-gray-700 leading-relaxed">
                        <CheckCircle2 size={16} className="text-primary-600 shrink-0 mt-0.5" />
                        <div>{renderCleanInline(cleanItem)}</div>
                      </li>
                    );
                  })}
                </ul>
              );
            }

            // Normal Paragraph
            return (
              <p key={idx} className="text-gray-700 text-base leading-relaxed my-4">
                {renderCleanInline(trimmed)}
              </p>
            );
          })}
        </div>

        {/* Support Callout Banner (Clean, No AI) */}
        <div className="mt-14 bg-gradient-to-br from-slate-900 to-slate-950 rounded-3xl p-8 sm:p-10 text-white shadow-xl relative overflow-hidden">
          <div className="max-w-xl relative z-10">
            <span className="text-primary-400 text-xs font-bold uppercase tracking-wider block mb-2">Merchant Support Desk</span>
            <h3 className="text-2xl font-black mb-3">Questions About This Guide?</h3>
            <p className="text-slate-300 text-sm leading-relaxed mb-6">
              Our technical team is ready to assist you with dedicated virtual accounts, webhook integrations, or account tier upgrades.
            </p>
            <div className="flex flex-wrap gap-4">
              <a 
                href="mailto:support@vtstack.ng" 
                className="px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-bold text-xs rounded-xl transition-all flex items-center gap-2 shadow-md"
              >
                <Mail size={14} />
                <span>Email Support (support@vtstack.ng)</span>
              </a>
              <a 
                href="https://wa.me/2348024230597" 
                target="_blank" 
                rel="noopener noreferrer"
                className="px-5 py-2.5 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-xl transition-all flex items-center gap-2 border border-white/10"
              >
                <Phone size={14} />
                <span>WhatsApp: 08024230597</span>
              </a>
            </div>
          </div>
        </div>

        {/* Related Guides */}
        <div className="mt-16">
          <h3 className="text-xl font-black text-gray-900 mb-6">Related Guides & Tutorials</h3>
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
