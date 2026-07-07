"use client";

import { useState } from "react";
import {
  Lock, MessageCircle, Bell, Globe, Users, TrendingUp, Calendar,
  IndianRupee, BarChart3, Zap, ArrowRight, CheckCircle2, Star,
  Phone, Mail, Target, Sparkles, Shield, Clock, Send, Bot,
  FileText, GraduationCap, Megaphone
} from "lucide-react";

const features = [
  {
    icon: MessageCircle,
    title: "WhatsApp Automation",
    description: "Send automated messages to students and parents via WhatsApp. Fee reminders, attendance alerts, test scores — all delivered instantly.",
    highlights: ["Bulk WhatsApp messaging", "Personalized templates", "Delivery & read receipts", "Scheduled messages"],
    color: "emerald",
    gradient: "from-emerald-500 to-teal-600",
  },
  {
    icon: Bell,
    title: "Smart Reminders",
    description: "Never miss a follow-up. Automated reminders for pending fees, low attendance, upcoming tests, and homework deadlines.",
    highlights: ["Fee due date alerts", "Attendance below threshold", "Test score notifications", "Homework reminders to parents"],
    color: "blue",
    gradient: "from-blue-500 to-indigo-600",
  },
  {
    icon: Target,
    title: "Lead Management & CRM",
    description: "Track every inquiry from first contact to admission. Visual pipeline, follow-up scheduling, and conversion analytics.",
    highlights: ["Visual admission pipeline", "Auto follow-up scheduling", "Source tracking (Website, Walk-in, Referral)", "Conversion rate analytics"],
    color: "violet",
    gradient: "from-violet-500 to-purple-600",
  },
  {
    icon: Globe,
    title: "Website ↔ ERP Connection",
    description: "Connect your coaching website directly to ERP. Leads from website forms flow into your CRM automatically. Update website content from ERP.",
    highlights: ["Auto-capture website inquiries", "Real-time lead sync", "Update batches & fees on website", "Online admission forms"],
    color: "amber",
    gradient: "from-amber-500 to-orange-600",
  },
  {
    icon: Users,
    title: "Student & Parent Communication",
    description: "Keep parents informed about their child's progress. Automated monthly reports, attendance summaries, and fee statements via WhatsApp.",
    highlights: ["Monthly progress reports", "Attendance summary alerts", "Fee receipt & statement", "Custom announcements"],
    color: "rose",
    gradient: "from-rose-500 to-pink-600",
  },
  {
    icon: Bot,
    title: "AI-Powered Insights",
    description: "Get smart recommendations on which leads to follow up, at-risk students who need attention, and revenue forecasting.",
    highlights: ["Lead scoring & prioritization", "At-risk student detection", "Revenue predictions", "Best time to contact"],
    color: "indigo",
    gradient: "from-indigo-500 to-blue-600",
  },
];

const automationExamples = [
  {
    trigger: "Fee Due Date Tomorrow",
    action: "WhatsApp reminder sent to parent",
    icon: IndianRupee,
    message: "Dear Parent, your child Aarav's fee of ₹15,000 is due tomorrow. Pay online: [link]",
  },
  {
    trigger: "Student Absent 3+ Days",
    action: "Alert sent to parent & admin",
    icon: Calendar,
    message: "Hi, Priya has been absent for 3 consecutive days. Please contact the academy or reply to this message.",
  },
  {
    trigger: "Test Results Published",
    action: "Score card sent to parent",
    icon: FileText,
    message: "Aarav scored 87/100 in Physics Test. Rank: 4th. View full report: [link]",
  },
  {
    trigger: "New Website Inquiry",
    action: "Lead created + Welcome message",
    icon: Globe,
    message: "Welcome! Thank you for your interest in Ultra Vision Academy. Our team will contact you within 24 hours.",
  },
  {
    trigger: "Homework Not Submitted",
    action: "Reminder sent to student & parent",
    icon: GraduationCap,
    message: "Reminder: Physics homework 'Wave Optics' is due today. Please submit before 6 PM.",
  },
];

const stats = [
  { label: "Messages Sent Monthly", value: "10,000+", icon: Send },
  { label: "Average Response Time", value: "< 2 min", icon: Clock },
  { label: "Fee Collection Rate", value: "+35%", icon: TrendingUp },
  { label: "Lead Conversion", value: "+50%", icon: Target },
];

export default function LeadsPremiumPage() {
  const [expandedFeature, setExpandedFeature] = useState(null);

  return (
    <div className="max-w-[1200px] mx-auto space-y-8 pb-16">
      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white p-6 sm:p-10">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-violet-500/5 rounded-full blur-3xl" />
        </div>

        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-4">
            <span className="flex items-center gap-1.5 text-[11px] font-bold text-amber-400 bg-amber-400/10 px-3 py-1.5 rounded-full border border-amber-400/20">
              <Sparkles size={12} /> PREMIUM MODULE
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight mb-3">
            Leads, CRM & <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-400">WhatsApp Automation</span>
          </h1>

          <p className="text-gray-300 text-sm sm:text-base max-w-2xl leading-relaxed mb-6">
            Supercharge your academy with automated WhatsApp communication, smart lead management,
            and website integration. Convert more leads, collect fees faster, and keep every parent informed — all on autopilot.
          </p>

          <div className="flex flex-wrap gap-3">
            <a
              href="https://wa.me/919509728788?text=Hi%2C%20I%20want%20to%20know%20about%20the%20Premium%20CRM%20%26%20WhatsApp%20Automation%20module%20for%20Ultra%20Vision%20Academy%20ERP."
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-amber-500/25 hover:shadow-xl hover:shadow-amber-500/30 transition-all hover:-translate-y-0.5"
            >
              <Zap size={16} /> Upgrade to Premium
            </a>
            <a
              href="https://wa.me/919509728788?text=Hi%2C%20I%20want%20a%20demo%20of%20the%20Premium%20CRM%20module."
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-white/10 text-white px-5 py-2.5 rounded-xl text-sm font-bold border border-white/20 hover:bg-white/20 transition-all"
            >
              <Phone size={16} /> Request Demo
            </a>
          </div>
        </div>
      </div>

      {/* Impact Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {stats.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div key={i} className="bg-white border border-gray-100 rounded-2xl p-4 text-center hover:shadow-md transition-shadow">
              <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center mx-auto mb-2">
                <Icon size={18} className="text-gray-600" />
              </div>
              <div className="text-xl font-extrabold text-gray-900">{stat.value}</div>
              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mt-1">{stat.label}</div>
            </div>
          );
        })}
      </div>

      {/* Feature Cards */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <h2 className="text-lg font-bold text-gray-900">What You Get</h2>
          <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">6 MODULES</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((feature, i) => {
            const Icon = feature.icon;
            const isExpanded = expandedFeature === i;
            return (
              <div
                key={i}
                className="bg-white border border-gray-100 rounded-2xl p-5 hover:shadow-lg transition-all duration-300 cursor-pointer group relative overflow-hidden"
                onClick={() => setExpandedFeature(isExpanded ? null : i)}
              >
                {/* Lock badge */}
                <div className="absolute top-3 right-3">
                  <span className="flex items-center gap-1 text-[9px] font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded-md border border-amber-200">
                    <Lock size={9} /> LOCKED
                  </span>
                </div>

                <div className={`w-11 h-11 rounded-2xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center mb-3 shadow-lg`}>
                  <Icon size={20} className="text-white" />
                </div>

                <h3 className="text-sm font-bold text-gray-900 mb-1.5">{feature.title}</h3>
                <p className="text-xs text-gray-500 leading-relaxed mb-3">{feature.description}</p>

                <div className={`space-y-1.5 transition-all duration-300 ${isExpanded ? "max-h-40 opacity-100" : "max-h-0 opacity-0 overflow-hidden"}`}>
                  {feature.highlights.map((h, j) => (
                    <div key={j} className="flex items-center gap-2 text-xs text-gray-600">
                      <CheckCircle2 size={12} className={`text-${feature.color}-500 flex-shrink-0`} />
                      <span>{h}</span>
                    </div>
                  ))}
                </div>

                <button className="mt-3 flex items-center gap-1 text-[11px] font-bold text-gray-400 group-hover:text-gray-600 transition-colors">
                  {isExpanded ? "Show less" : "See details"} <ArrowRight size={11} className={`transition-transform ${isExpanded ? "rotate-90" : ""}`} />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Automation Examples */}
      <div className="bg-white border border-gray-100 rounded-2xl p-5 sm:p-6">
        <div className="flex items-center gap-2 mb-5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
            <Zap size={16} className="text-white" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-gray-900">Live Automation Examples</h2>
            <p className="text-[11px] text-gray-400">See how automated messages work in real-time</p>
          </div>
        </div>

        <div className="space-y-3">
          {automationExamples.map((ex, i) => {
            const Icon = ex.icon;
            return (
              <div key={i} className="border border-gray-100 rounded-xl p-4 hover:bg-gray-50/50 transition-colors">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0">
                    <Icon size={16} className="text-gray-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1.5">
                      <span className="text-[10px] font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded border border-orange-200 uppercase tracking-wider">Trigger</span>
                      <span className="text-xs font-semibold text-gray-800">{ex.trigger}</span>
                      <ArrowRight size={10} className="text-gray-300" />
                      <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 uppercase tracking-wider">Action</span>
                      <span className="text-xs text-gray-600">{ex.action}</span>
                    </div>

                    {/* WhatsApp message preview */}
                    <div className="bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2 mt-2 relative">
                      <div className="flex items-center gap-1.5 mb-1">
                        <MessageCircle size={10} className="text-emerald-600" />
                        <span className="text-[9px] font-bold text-emerald-700 uppercase tracking-wider">WhatsApp Preview</span>
                      </div>
                      <p className="text-[11px] text-gray-700 leading-relaxed">{ex.message}</p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Website Integration Showcase */}
      <div className="bg-gradient-to-br from-indigo-50 to-violet-50 border border-indigo-100 rounded-2xl p-5 sm:p-6">
        <div className="flex items-start gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center flex-shrink-0">
            <Globe size={18} className="text-white" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-gray-900">Website ↔ ERP Integration</h2>
            <p className="text-xs text-gray-500 mt-0.5">Your coaching website and ERP work as one system</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            { title: "Auto-Capture Leads", desc: "Website inquiry forms automatically create leads in your CRM. No manual data entry.", icon: Target },
            { title: "Live Batch Updates", desc: "Update batch timings, fees, or availability in ERP — website reflects changes instantly.", icon: Clock },
            { title: "Online Admission", desc: "Parents can apply online. Applications flow directly into ERP for review and enrollment.", icon: GraduationCap },
            { title: "Content Management", desc: "Update faculty info, results, testimonials, and announcements from your ERP dashboard.", icon: Megaphone },
          ].map((item, i) => {
            const Icon = item.icon;
            return (
              <div key={i} className="bg-white/80 backdrop-blur-sm border border-indigo-100/50 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Icon size={14} className="text-indigo-600" />
                  <h3 className="text-xs font-bold text-gray-900">{item.title}</h3>
                </div>
                <p className="text-[11px] text-gray-500 leading-relaxed">{item.desc}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Pricing / CTA */}
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
        <div className="p-5 sm:p-6 text-center">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-amber-500/20">
            <Star size={24} className="text-white" />
          </div>
          <h2 className="text-lg font-extrabold text-gray-900 mb-2">Ready to Automate Your Academy?</h2>
          <p className="text-sm text-gray-500 max-w-md mx-auto mb-5">
            Get the Premium module with WhatsApp automation, lead CRM, website integration,
            and AI insights. Transform how you manage your coaching institute.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-6">
            <a
              href="https://wa.me/919509728788?text=Hi%2C%20I%20am%20interested%20in%20the%20Premium%20CRM%20%26%20Automation%20module%20for%20my%20coaching%20institute%20ERP.%20Please%20share%20pricing%20and%20details."
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white px-6 py-3 rounded-xl text-sm font-bold shadow-lg shadow-amber-500/25 hover:shadow-xl hover:shadow-amber-500/30 transition-all hover:-translate-y-0.5"
            >
              <Zap size={16} /> Get Premium Access
            </a>
            <a
              href="https://wa.me/919509728788?text=Hi%2C%20I%20want%20a%20demo%20of%20the%20CRM%20%26%20WhatsApp%20automation%20module."
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-gray-600 px-6 py-3 rounded-xl text-sm font-bold border border-gray-200 hover:bg-gray-50 transition-all"
            >
              <Phone size={16} /> Schedule a Demo
            </a>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 text-[11px] text-gray-400">
            <span className="flex items-center gap-1"><Shield size={12} className="text-emerald-500" /> Secure & Private</span>
            <span className="flex items-center gap-1"><Zap size={12} className="text-amber-500" /> Instant Setup</span>
            <span className="flex items-center gap-1"><Phone size={12} className="text-blue-500" /> Dedicated Support</span>
          </div>
        </div>
      </div>
    </div>
  );
}
