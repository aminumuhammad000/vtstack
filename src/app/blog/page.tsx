'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { 
  Search, 
  BookOpen, 
  ArrowRight, 
  CheckCircle2, 
  HelpCircle, 
  ChevronRight,
  ShieldCheck,
  CreditCard,
  Code2
} from 'lucide-react';
import { Navbar } from '@/components/public/Navbar';
import { Footer } from '@/components/public/Footer';
import { BLOG_POSTS, BlogPost } from '@/lib/blog-data';

export default function BlogHubPage() {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');

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

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-gray-900 selection:bg-primary-100 selection:text-primary-900">
      <Navbar transparent={false} />

      {/* Clean Hero Section */}
      <section className="relative pt-36 pb-16 overflow-hidden bg-gradient-to-b from-white via-primary-50/20 to-slate-50 border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary-100/70 border border-primary-200 text-primary-800 text-xs font-bold uppercase tracking-wider mb-6">
              <BookOpen size={14} className="text-primary-600" />
              Official VTStack Documentation & How-To Guides
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-gray-900 tracking-tight leading-tight mb-6">
              Learn, Build and Scale with <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-600 to-primary-700">VTStack</span>
            </h1>
            <p className="text-base sm:text-lg text-gray-600 leading-relaxed mb-8">
              Authoritative step-by-step guides written by Aminu Muhammad covering real PalmPay virtual accounts, KYC compliance, developer webhooks, and automated bank settlements.
            </p>

            {/* Clean Search Input */}
            <div className="relative max-w-xl mx-auto">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search guides by keyword, topic, or feature (e.g. PalmPay, BVN, Webhooks)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-white border border-gray-200 shadow-sm rounded-2xl text-sm focus:outline-none focus:border-primary-500 font-medium placeholder-gray-400"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Main Content & Articles Section */}
      <section className="py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Category Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-10 scrollbar-none">
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

        {/* Complete Roadmap Section */}
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
