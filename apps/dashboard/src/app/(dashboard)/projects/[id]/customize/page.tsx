"use client";

import { ProjectTabs } from "@/components/layout/ProjectTabs";
import { Button, GlassCard, Toggle } from "@/components/ui";
import { useProject, useWidget } from "@/hooks";
import { IconKey, IconMail } from "@tabler/icons-react";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

type Tab = "design" | "methods" | "advanced" | "integration";

export default function CustomizePage() {
  const { id } = useParams<{ id: string }>();
  const { project } = useProject(id);
  const { widget, isLoading, updateWidget } = useWidget(id);

  const [tab, setTab] = useState<Tab>("design");
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#0E172B");
  const [logoUrl, setLogoUrl] = useState("");
  const [termsUrl, setTermsUrl] = useState("");
  const [privacyUrl, setPrivacyUrl] = useState("");
  const [showBadge, setShowBadge] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (widget) {
      setTitle(widget.title || "");
      setSubtitle(widget.subtitle || "");
      setPrimaryColor(widget.themeConfig?.primaryColor || "#0E172B");
      setLogoUrl(widget.themeConfig?.logoUrl || "");
      setTermsUrl(widget.themeConfig?.termsUrl || "");
      setPrivacyUrl(widget.themeConfig?.privacyUrl || "");
      setShowBadge(widget.themeConfig?.showSecuredBadge !== false);
    }
  }, [widget]);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      await updateWidget.mutateAsync({
        title,
        subtitle,
        themeConfig: {
          primaryColor,
          logoUrl,
          termsUrl,
          privacyUrl,
          showSecuredBadge: showBadge,
        },
        enabledProviders: ["email"],
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  };

  const tabs: { key: Tab; label: string }[] = [
    { key: "design", label: "Design" },
    { key: "methods", label: "Methods" },
    { key: "advanced", label: "Advanced" },
    { key: "integration", label: "Integration" },
  ];

  return (
    <div>
      <ProjectTabs projectId={id} projectName={project?.name} />

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Left: Config */}
        <div>
          {/* Tab bar */}
          <div className="flex flex-wrap items-center gap-1 bg-slate-100/80 rounded-xl p-1 mb-6">
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${tab === t.key
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                  }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {isLoading ? (
            <GlassCard>
              <div className="text-center text-slate-400 py-8">Loading widget config...</div>
            </GlassCard>
          ) : (
            <>
              {tab === "design" && (
                <GlassCard>
                  <h3 className="text-lg font-bold text-slate-800 mb-6">Design</h3>
                  <div className="space-y-5">
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">Title</label>
                      <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="Sign in to Your App"
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-100 focus:border-[var(--accent)] transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">Subtitle</label>
                      <input
                        type="text"
                        value={subtitle}
                        onChange={(e) => setSubtitle(e.target.value)}
                        placeholder="Welcome! Please sign in to continue."
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-100 focus:border-[var(--accent)] transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">Primary Color</label>
                      <div className="flex items-center gap-3">
                        <input
                          type="color"
                          value={primaryColor}
                          onChange={(e) => setPrimaryColor(e.target.value)}
                          className="w-10 h-10 rounded-lg border border-slate-200 cursor-pointer"
                        />
                        <input
                          type="text"
                          value={primaryColor}
                          onChange={(e) => setPrimaryColor(e.target.value)}
                          className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-mono text-sm"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">Logo URL</label>
                      <input
                        type="url"
                        value={logoUrl}
                        onChange={(e) => setLogoUrl(e.target.value)}
                        placeholder="https://yourapp.com/logo.png"
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-100 focus:border-[var(--accent)] transition-all"
                      />
                    </div>
                  </div>
                </GlassCard>
              )}

              {tab === "methods" && (
                <GlassCard>
                  <h3 className="text-lg font-bold text-slate-800 mb-6">Auth Methods</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center border border-slate-100">
                          <IconMail className="w-5 h-5 text-slate-400" />
                        </div>
                        <div>
                          <p className="font-medium text-slate-800">Email OTP</p>
                          <p className="text-xs text-slate-400">One-time passwords via email</p>
                        </div>
                      </div>
                      <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full">Always On</span>
                    </div>

                    {[
                      { label: "Google SSO", desc: "Sign in with Google" },
                      { label: "GitHub SSO", desc: "Sign in with GitHub" },
                      { label: "Apple SSO", desc: "Sign in with Apple" },
                    ].map((provider) => (
                      <div key={provider.label} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl opacity-60">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center border border-slate-100">
                            <IconKey className="w-5 h-5 text-slate-400" />
                          </div>
                          <div>
                            <p className="font-medium text-slate-800">{provider.label}</p>
                            <p className="text-xs text-slate-400">{provider.desc}</p>
                          </div>
                        </div>
                        <span className="text-xs font-bold text-slate-400 bg-slate-100 px-3 py-1 rounded-full">Coming Soon</span>
                      </div>
                    ))}
                  </div>
                </GlassCard>
              )}

              {tab === "advanced" && (
                <GlassCard>
                  <h3 className="text-lg font-bold text-slate-800 mb-6">Advanced</h3>
                  <div className="space-y-5">
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">Terms of Service URL</label>
                      <input
                        type="url"
                        value={termsUrl}
                        onChange={(e) => setTermsUrl(e.target.value)}
                        placeholder="https://yourapp.com/terms"
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-100 focus:border-[var(--accent)] transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">Privacy Policy URL</label>
                      <input
                        type="url"
                        value={privacyUrl}
                        onChange={(e) => setPrivacyUrl(e.target.value)}
                        placeholder="https://yourapp.com/privacy"
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-100 focus:border-[var(--accent)] transition-all"
                      />
                    </div>
                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                      <div>
                        <p className="font-medium text-slate-800">Show &quot;Secured by Permit&quot; badge</p>
                        <p className="text-xs text-slate-400">Display a trust badge in the login widget footer</p>
                      </div>
                      <Toggle enabled={showBadge} onChange={() => setShowBadge(!showBadge)} />
                    </div>
                  </div>
                </GlassCard>
              )}

              {tab === "integration" && (
                <GlassCard>
                  <h3 className="text-lg font-bold text-slate-800 mb-6">Integration</h3>
                  <p className="text-sm text-slate-500 mb-4">Add Permit authentication to your app with just a few lines of code.</p>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Install</label>
                      <pre className="bg-slate-900 text-slate-100 rounded-xl p-4 text-sm font-mono overflow-x-auto">
                        npm install @permitdev/react
                      </pre>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Usage</label>
                      <pre className="bg-slate-900 rounded-xl p-4 text-sm font-mono overflow-x-auto whitespace-pre">
                        <span className="text-purple-400">import</span> <span className="text-slate-100">{"{ "}</span><span className="text-blue-400">PermitProvider</span><span className="text-slate-100">{" }"}</span> <span className="text-purple-400">from</span> <span className="text-emerald-400">{`'@permitdev/react'`}</span><span className="text-slate-100">;</span>{"\n"}{"\n"}<span className="text-purple-400">function</span> <span className="text-blue-400">App</span><span className="text-slate-100">() {"{"}</span>{"\n"}{"  "}<span className="text-purple-400">return</span> <span className="text-slate-100">(</span>{"\n"}{"    "}<span className="text-blue-400">{"<PermitProvider"}</span> <span className="text-slate-300">projectId</span><span className="text-slate-100">=</span><span className="text-emerald-400">{`"${id}"`}</span><span className="text-blue-400">{">"}</span>{"\n"}{"      "}<span className="text-slate-500">{`{/* Your app */}`}</span>{"\n"}{"    "}<span className="text-blue-400">{"</PermitProvider>"}</span>{"\n"}{"  "}<span className="text-slate-100">);</span>{"\n"}<span className="text-slate-100">{"}"}</span></pre>
                    </div>
                  </div>
                </GlassCard>
              )}

              {/* Save button */}
              {tab !== "integration" && (
                <div className="mt-6 flex items-center gap-4">
                  <Button isLoading={saving} onClick={handleSave}>
                    {saving ? "Saving..." : "Save Changes"}
                  </Button>
                  {saved && (
                    <span className="text-sm font-medium text-emerald-600">Saved!</span>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Right: Live Preview */}
        <div>
          <h3 className="text-lg font-bold text-slate-800 mb-4">Preview</h3>
          <GlassCard className="flex items-center justify-center min-h-[300px] lg:min-h-[500px]">
            <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl border border-slate-100 p-8">
              {/* Logo */}
              {logoUrl && (
                <div className="flex justify-center mb-4">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={logoUrl} alt="Logo" className="h-10 object-contain" />
                </div>
              )}

              {/* Title */}
              <h2 className="text-xl font-bold text-center text-slate-900 mb-1">
                {title || "Sign in"}
              </h2>
              <p className="text-sm text-center text-slate-500 mb-6">
                {subtitle || "Welcome! Please sign in to continue."}
              </p>

              {/* Email input */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-700 mb-1">Email address</label>
                <div className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-400">
                  you@example.com
                </div>
              </div>

              {/* Button */}
              <button
                className="w-full py-3 rounded-lg text-white text-sm font-bold"
                style={{ backgroundColor: primaryColor }}
              >
                Continue
              </button>

              {/* Footer */}
              {showBadge && (
                <p className="text-xs text-center text-slate-400 mt-4">
                  Secured by <span className="text-blue-500">Permit</span>
                </p>
              )}
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
