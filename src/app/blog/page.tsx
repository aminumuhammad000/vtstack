'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { 
  Search, 
  Sparkles, 
  BookOpen, 
  ArrowRight, 
  CheckCircle2, 
  HelpCircle, 
  CreditCard, 
  ShieldCheck, 
  Code2, 
  ArrowUpRight,
  Send,
  Loader2,
  ChevronRight
} from 'lucide-react';
import { Navbar } from '@/components/public/Navbar';
import { Footer } from '@/components/public/Footer';
import { BLOG_POSTS, BlogPost } from '@/lib/blog-data';

export default function BlogHubPage() {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [aiQuestion, setAiQuestion] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<{
    title: string;
    answer: string;
    steps: string[];
    relatedArticle?: { slug: string; url: string } | null;
  } | null>(null);

  const categories = [
    'All',
    'Virtual Accounts',
    'KYC & Verification',
    'Developer & Webhooks',
    'Payouts & Settlements',
    'Security & Setup'
  ];

  const filteredPosts = BLOG_POSTS.filter(post => {
    const matchesCategory = selectedCategory === 'All' || post.category === selectedCategory;
    const matchesSearch = 
      post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.excerpt.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  const handleAskAi = async (e?: React.FormEvent, customQuestion?: string) => {
    if (e) e.preventDefault();
    const queryToUse = customQuestion || aiQuestion;
    if (!queryToUse.trim()) return;

    setAiLoading(true);
    setAiResult(null);

    try {
      const res = await fetch('/api/help/ai-query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: queryToUse })
      });
      const data = await res.json();
      if (data.success && data.data) {
        setAiResult(data.data);
      }
    } catch (err) {
      console.error('AI query error:', err);
    } finally {
      setAiLoading(false);
    }
  };

  const quickPrompts = [
    'How do I create a real PalmPay virtual account?',
    'Why is my 11-digit BVN required for virtual accounts?',
    'How do I verify webhook signatures in Node.js?',
    'How do I upgrade to Tier 3 KYC with CAC?',
    'How to automate daily bank settlements?'
  ];

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-gray-900 selection:bg-primary-100 selection:text-primary-900">
      <Navbar transparent={false} />

      {/* Hero Section */}
      <section className="relative pt-36 pb-20 overflow-hidden bg-gradient-to-b from-white via-primary-50/30 to-slate-50 border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary-100/70 border border-primary-200 text-primary-800 text-xs font-bold uppercase tracking-wider mb-6">
              <Sparkles size={14} className="text-primary-600 animate-pulse" />
              VTStack Knowledge Base & How-To Guides
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-gray-900 tracking-tight leading-tight mb-6">
              Learn, Build & Scale with <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-600 to-primary-700">VTStack</span>
            </h1>
            <p className="text-lg text-gray-600 leading-relaxed mb-10">
              Clear, step-by-step tutorials covering your entire payment journey: from real PalmPay virtual accounts and KYC compliance to automated bank settlements and developer webhooks.
            </p>

            {/* AI Assistant Search Bar */}
            <div className="bg-white p-3 rounded-3xl shadow-xl shadow-primary-950/5 border border-primary-100 max-w-2xl mx-auto">
              <form onSubmit={handleAskAi} className="flex items-center gap-2">
                <div className="pl-3 text-primary-600">
                  <Sparkles size={20} />
                </div>
                <input
                  type="text"
                  placeholder="Ask our AI assistant any how-to question..."
                  value={aiQuestion}
                  onChange={(e) => setAiQuestion(e.target.value)}
                  className="w-full py-2.5 px-2 bg-transparent text-gray-900 text-sm focus:outline-none placeholder-gray-400 font-medium"
                />
                <button
                  type="submit"
                  disabled={aiLoading || !aiQuestion.trim()}
                  className="px-6 py-2.5 bg-gray-900 hover:bg-primary-600 text-white font-bold text-sm rounded-2xl transition-all duration-200 flex items-center gap-2 shrink-0 disabled:opacity-50 shadow-md"
                >
                  {aiLoading ? <Loader2 size={16} className="animate-spin" /> : <Send size={15} />}
                  <span>Ask AI</span>
                </button>
              </form>

              {/* Quick Prompts */}
              <div className="flex items-center gap-2 overflow-x-auto py-2.5 px-2 mt-2 border-t border-gray-100 scrollbar-none text-xs">
                <span className="font-bold text-gray-400 shrink-0">Popular:</span>
                {quickPrompts.map((prompt, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setAiQuestion(prompt);
                      handleAskAi(undefined, prompt);
                    }}
                    className="shrink-0 px-2.5 py-1 rounded-lg bg-gray-100 hover:bg-primary-50 hover:text-primary-700 text-gray-600 font-medium transition-colors"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>

            {/* AI Result Card */}
            {aiResult && (
              <div className="mt-8 text-left bg-white border-2 border-primary-200/80 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-primary-500/10 max-w-2xl mx-auto animate-in fade-in slide-in-from-top-4 duration-300">
                <div className="flex items-center justify-between gap-4 mb-4 pb-3 border-b border-gray-100">
                  <div className="flex items-center gap-2">
                    <span className="p-2 bg-primary-500 text-white rounded-xl">
                      <Sparkles size={18} />
                    </span>
                    <div>
                      <span className="text-xs font-bold text-primary-600 uppercase tracking-wider">AI Instant Guide</span>
                      <h3 className="font-black text-gray-900 text-lg leading-snug">{aiResult.title}</h3>
                    </div>
                  </div>
                  <button 
                    onClick={() => setAiResult(null)}
                    className="text-gray-400 hover:text-gray-600 text-sm font-semibold"
                  >
                    Close
                  </button>
                </div>

                <p className="text-gray-700 leading-relaxed text-sm mb-4 font-normal">
                  {aiResult.answer}
                </p>

                {aiResult.steps && aiResult.steps.length > 0 && (
                  <div className="space-y-2 mb-6 bg-slate-50 p-4 rounded-2xl border border-gray-100">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">Step-by-Step Instructions:</h4>
                    {aiResult.steps.map((step, idx) => (
                      <div key={idx} className="flex items-start gap-2.5 text-xs text-gray-800">
                        <CheckCircle2 size={15} className="text-primary-600 shrink-0 mt-0.5" />
                        <span>{step}</span>
                      </div>
                    ))}
                  </div>
                )}

                {aiResult.relatedArticle && (
                  <Link
                    href={aiResult.relatedArticle.url}
                    className="inline-flex items-center gap-2 text-sm font-bold text-primary-600 hover:text-primary-700 group"
                  >
                    Read complete detailed guide
                    <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                  </Link>
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Main Content & Articles Section */}
      <section className="py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Controls: Search and Categories */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 mb-12">
          {/* Category Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  selectedCategory === cat
                    ? 'bg-gray-900 text-white shadow-md'
                    : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Search Input */}
          <div className="relative min-w-[260px] md:w-72">
            <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search guides..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary-500 font-medium"
            />
          </div>
        </div>

        {/* Articles Grid */}
        {filteredPosts.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-3xl border border-gray-100">
            <HelpCircle size={48} className="mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-bold text-gray-800">No matching guides found</h3>
            <p className="text-gray-500 text-sm mt-1">Try searching for keywords like "PalmPay", "BVN", "Webhooks", or "Payouts".</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredPosts.map((post) => (
              <article
                key={post.slug}
                className="bg-white rounded-3xl p-6 sm:p-7 border border-gray-100 shadow-sm hover:shadow-xl hover:shadow-primary-500/10 hover:border-primary-200 transition-all duration-300 flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-center justify-between text-xs mb-4">
                    <span className="px-3 py-1 rounded-full bg-primary-50 text-primary-700 font-bold">
                      {post.category}
                    </span>
                    <span className="text-gray-400 font-medium">{post.readTime}</span>
                  </div>

                  <h2 className="text-xl font-bold text-gray-900 mb-3 group-hover:text-primary-600 transition-colors line-clamp-2">
                    <Link href={`/blog/${post.slug}`}>
                      {post.title}
                    </Link>
                  </h2>

                  <p className="text-gray-600 text-sm leading-relaxed mb-6 line-clamp-3">
                    {post.excerpt}
                  </p>
                </div>

                <div>
                  <div className="flex flex-wrap gap-1.5 mb-6">
                    {post.tags.slice(0, 3).map((tag, idx) => (
                      <span key={idx} className="text-[11px] font-semibold bg-gray-50 text-gray-500 px-2 py-0.5 rounded-md border border-gray-100">
                        #{tag}
                      </span>
                    ))}
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                    <div className="flex items-center gap-2.5">
                      <img 
                        src={post.author.avatar} 
                        alt={post.author.name} 
                        className="w-7 h-7 rounded-full object-cover" 
                      />
                      <div>
                        <p className="text-xs font-bold text-gray-800 leading-none">{post.author.name}</p>
                        <p className="text-[10px] text-gray-400 mt-0.5">{post.publishedAt}</p>
                      </div>
                    </div>

                    <Link
                      href={`/blog/${post.slug}`}
                      className="text-xs font-bold text-primary-600 hover:text-primary-700 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform"
                    >
                      Read Guide <ArrowRight size={13} />
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}

        {/* Journey Highlights Carousel / Section */}
        <div className="mt-24 bg-gradient-to-br from-gray-900 via-gray-900 to-gray-950 rounded-3xl p-8 sm:p-12 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-[450px] h-[450px] bg-primary-500/10 rounded-full blur-[100px] pointer-events-none"></div>

          <div className="max-w-2xl mb-12">
            <span className="text-primary-400 text-xs font-bold uppercase tracking-wider">The Complete Merchant Roadmap</span>
            <h2 className="text-3xl sm:text-4xl font-black mt-2 mb-4">Master Your Entire VTStack Journey</h2>
            <p className="text-gray-400 text-sm sm:text-base leading-relaxed">
              From onboarding and KYC compliance to receiving real PalmPay customer payments and settling to your bank, follow our recommended sequence:
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                step: '01',
                title: 'Register & Verify',
                desc: 'Create an account, verify email OTP, and complete Tier 1 BVN/NIN verification.',
                link: '/blog/kyc-verification-tier1-to-tier3-guide'
              },
              {
                step: '02',
                title: 'Generate Virtual Account',
                desc: 'Instantly issue dedicated 10-digit PalmPay NUBAN accounts for automated collections.',
                link: '/blog/how-to-generate-real-palmpay-virtual-accounts'
              },
              {
                step: '03',
                title: 'Connect Webhooks',
                desc: 'Get real-time digital signature notifications when customers pay into your accounts.',
                link: '/blog/developer-integration-api-keys-and-webhooks'
              },
              {
                step: '04',
                title: 'Automate Settlements',
                desc: 'Set your 4-digit PIN and configure automatic daily transfers to your bank account.',
                link: '/blog/how-to-request-and-automate-payouts-and-settlements'
              }
            ].map((item, idx) => (
              <Link
                key={idx}
                href={item.link}
                className="bg-gray-800/60 hover:bg-gray-800 border border-gray-700/60 hover:border-primary-500/50 rounded-2xl p-6 transition-all duration-300 group flex flex-col justify-between"
              >
                <div>
                  <span className="text-2xl font-black text-primary-400/80 mb-3 block font-mono">{item.step}</span>
                  <h3 className="text-base font-bold text-white mb-2 group-hover:text-primary-300 transition-colors">{item.title}</h3>
                  <p className="text-xs text-gray-400 leading-relaxed">{item.desc}</p>
                </div>
                <div className="mt-6 flex items-center gap-1.5 text-xs font-bold text-primary-400 group-hover:translate-x-1 transition-transform">
                  <span>View Step Guide</span>
                  <ChevronRight size={14} />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
