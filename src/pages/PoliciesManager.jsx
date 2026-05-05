import React, { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { backendUrl } from "../App";
import {
  FileText,
  Plus,
  Save,
  Trash2,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";

const TERMS_KEY = "terms-and-conditions";
const PRIVACY_KEY = "privacy-policy";

const emptyTerm = {
  title: "",
  text: "",
};

const emptyPolicy = {
  key: "",
  title: "",
  content: [{ ...emptyTerm }],
  requiredOnRegister: false,
  sortOrder: 1,
  isActive: true,
};

const PoliciesManager = ({ token }) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    title: "Saint Clothing Policies",
    description:
      "Store rules, terms, privacy, shipping, returns, and payment policies.",
    version: "",
    policies: [],
  });

  const panelBg =
    "bg-white border border-black/10 shadow-[0_8px_24px_rgba(0,0,0,0.05)]";
  const softPanelBg = "bg-[#FAFAF8] border border-black/10";
  const inputClass =
    "w-full rounded-[5px] border border-black/10 bg-white px-3 py-2.5 text-sm font-semibold text-[#0A0D17] outline-none transition focus:border-black disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-500";
  const labelClass =
    "text-[10px] font-black uppercase tracking-[0.22em] text-[#0A0D17]/45";
  const buttonDark =
    "inline-flex items-center justify-center gap-2 rounded-[5px] bg-[#0A0D17] px-4 py-2.5 text-sm font-black text-white transition hover:bg-[#1f2937] disabled:opacity-50";
  const buttonLight =
    "inline-flex items-center justify-center gap-2 rounded-[5px] border border-black/10 bg-white px-4 py-2.5 text-sm font-black text-[#0A0D17] transition hover:bg-[#FAFAF8] disabled:opacity-50";
  const dangerButton =
    "inline-flex items-center justify-center gap-2 rounded-[5px] border border-red-200 bg-red-50 px-3 py-2 text-[10px] font-black uppercase tracking-[0.14em] text-red-600 transition hover:bg-red-500 hover:text-white";

  const fetchPolicies = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${backendUrl}/api/policy`);

      if (res.data.success) {
        const data = res.data.policySet;

        setForm({
          title: data.title || "Saint Clothing Policies",
          description: data.description || "",
          version: data.version || "",
          policies:
            data.policies?.length > 0
              ? data.policies.map((item, index) => ({
                  key: item.key || "",
                  title: item.title || "",
                  content:
                    Array.isArray(item.content) && item.content.length > 0
                      ? item.content.map((term) => ({
                          title: term?.title || "",
                          text: term?.text || "",
                        }))
                      : [{ ...emptyTerm }],
                  requiredOnRegister:
                    String(item.key || "").trim().toLowerCase() === TERMS_KEY,
                  sortOrder: item.sortOrder ?? index + 1,
                  isActive: item.isActive !== false,
                }))
              : [],
        });
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load policies");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPolicies();
  }, []);

  const updatePolicyField = (index, field, value) => {
    setForm((prev) => {
      const next = [...prev.policies];
      if (!next[index]) return prev;

      next[index] = { ...next[index], [field]: value };

      const normalizedKey = String(next[index].key || "")
        .trim()
        .toLowerCase();

      if (normalizedKey === TERMS_KEY) {
        next[index].requiredOnRegister = true;
      }

      return { ...prev, policies: next };
    });
  };

  const updateTermField = (policyIndex, termIndex, field, value) => {
    setForm((prev) => {
      const next = [...prev.policies];
      const currentPolicy = next[policyIndex];
      if (!currentPolicy) return prev;

      const nextContent = [...(currentPolicy.content || [])];
      if (!nextContent[termIndex]) return prev;

      nextContent[termIndex] = {
        ...nextContent[termIndex],
        [field]: value,
      };

      next[policyIndex] = {
        ...currentPolicy,
        content: nextContent,
      };

      return { ...prev, policies: next };
    });
  };

  const addPolicy = () => {
    setForm((prev) => ({
      ...prev,
      policies: [
        ...prev.policies,
        { ...emptyPolicy, sortOrder: prev.policies.length + 1 },
      ],
    }));
  };

  const removePolicy = (index) => {
    setForm((prev) => {
      const target = prev.policies[index];
      const normalizedKey = String(target?.key || "").trim().toLowerCase();

      if (normalizedKey === TERMS_KEY) {
        toast.error("Terms & Conditions cannot be removed");
        return prev;
      }

      if (normalizedKey === PRIVACY_KEY) {
        toast.error("Privacy Policy cannot be removed");
        return prev;
      }

      return {
        ...prev,
        policies: prev.policies.filter((_, i) => i !== index),
      };
    });
  };

  const addTerm = (policyIndex) => {
    setForm((prev) => {
      const next = [...prev.policies];
      const currentPolicy = next[policyIndex];
      if (!currentPolicy) return prev;

      next[policyIndex] = {
        ...currentPolicy,
        content: [...(currentPolicy.content || []), { ...emptyTerm }],
      };

      return { ...prev, policies: next };
    });
  };

  const removeTerm = (policyIndex, termIndex) => {
    setForm((prev) => {
      const next = [...prev.policies];
      const currentPolicy = next[policyIndex];
      if (!currentPolicy) return prev;

      const currentContent = currentPolicy.content || [];

      next[policyIndex] = {
        ...currentPolicy,
        content:
          currentContent.length <= 1
            ? [{ ...emptyTerm }]
            : currentContent.filter((_, i) => i !== termIndex),
      };

      return { ...prev, policies: next };
    });
  };

  const normalizeContent = (content) => {
    return Array.isArray(content)
      ? content
          .map((term) => ({
            title: String(term?.title || "").trim(),
            text: String(term?.text || "").trim(),
          }))
          .filter((term) => term.title || term.text)
      : [];
  };

  const validatePolicies = () => {
    const privacyPolicy = form.policies.find(
      (item) => String(item.key || "").trim().toLowerCase() === PRIVACY_KEY
    );

    const termsPolicy = form.policies.find(
      (item) => String(item.key || "").trim().toLowerCase() === TERMS_KEY
    );

    if (!privacyPolicy) {
      toast.error("Privacy Policy is required");
      return false;
    }

    if (!termsPolicy) {
      toast.error("Terms & Conditions is required");
      return false;
    }

    if (!privacyPolicy.isActive) {
      toast.error("Privacy Policy must be active");
      return false;
    }

    const privacyContent = normalizeContent(privacyPolicy.content);

    if (privacyContent.length === 0) {
      toast.error("Privacy Policy must have at least 1 title or description");
      return false;
    }

    const emptyPrivacyText = privacyContent.some(
      (item) => !item.title.trim() || !item.text.trim()
    );

    if (emptyPrivacyText) {
      toast.error("Privacy Policy items need both Title and Description");
      return false;
    }

    return true;
  };

  const savePolicies = async () => {
    if (!validatePolicies()) return;

    try {
      setSaving(true);

      const payload = {
        title: form.title,
        description: form.description,
        version: form.version,
        updatedBy:
          localStorage.getItem("adminName") ||
          localStorage.getItem("name") ||
          localStorage.getItem("email") ||
          localStorage.getItem("role") ||
          "Admin",
        policies: form.policies.map((item, index) => {
          const normalizedKey = String(item.key || `policy-${index + 1}`)
            .trim()
            .toLowerCase();

          return {
            key: normalizedKey,
            title: item.title,
            content: normalizeContent(item.content),
            requiredOnRegister: normalizedKey === TERMS_KEY,
            sortOrder: Number(item.sortOrder || index + 1),
            isActive: item.isActive,
          };
        }),
      };

      const res = await axios.put(`${backendUrl}/api/policy/update`, payload, {
        headers: {
          Authorization: `Bearer ${token}`,
          token,
        },
      });

      if (res.data.success) {
        toast.success("Policies updated successfully");
        fetchPolicies();
      } else {
        toast.error(res.data.message || "Failed to save policies");
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to save policies");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-transparent p-3 pt-24 font-['Montserrat']">
        <div className="animate-pulse space-y-3">
          <div className="h-24 rounded-[5px] bg-white/70" />
          <div className="h-52 rounded-[5px] bg-white/70" />
          <div className="h-96 rounded-[5px] bg-white/70" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-transparent px-2.5 sm:px-3 pt-20 sm:pt-24 pb-4 font-['Montserrat']">
      <div className="max-w-[1500px] mx-auto">
        <div className="rounded-[5px] bg-[#0A0D17] p-5 sm:p-6 shadow-[0_18px_60px_rgba(0,0,0,0.08)] mb-4 text-white border border-black/10 overflow-hidden relative">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.34em] text-white/50 mb-2">
                Policy Content Manager
              </p>

              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-[5px] bg-white/10 border border-white/10 flex items-center justify-center shrink-0 backdrop-blur-sm">
                  <FileText size={18} />
                </div>

                <div className="min-w-0">
                  <h1 className="text-[22px] sm:text-[30px] font-black uppercase tracking-[-0.03em] truncate">
                    Policies
                  </h1>
                  <p className="text-[11px] sm:text-sm text-white/65 mt-1">
                    Manage terms, privacy consent, shipping, returns, payment
                    rules, and registration policy content.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={fetchPolicies}
                disabled={loading || saving}
                className="inline-flex items-center gap-2 rounded-[5px] border border-white/20 bg-white/10 text-white px-4 py-2.5 text-sm font-black transition hover:bg-white/20 disabled:opacity-50"
              >
                <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
                Refresh
              </button>

              <button
                type="button"
                onClick={savePolicies}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-[5px] bg-white text-[#111111] px-4 py-2.5 text-sm font-black transition hover:bg-[#ececec] shadow-sm disabled:opacity-50"
              >
                <Save size={16} />
                {saving ? "Saving..." : "Save Policies"}
              </button>
            </div>
          </div>
        </div>

        <div className={`${panelBg} rounded-[5px] p-4 sm:p-5 mb-4`}>
          <div className="flex flex-col gap-2 mb-4">
            <p className={labelClass}>Policy Set</p>
            <h3 className="text-sm sm:text-[17px] font-black uppercase tracking-[0.08em] text-[#0A0D17]">
              General Information
            </h3>
            <p className="text-[11px] sm:text-xs text-[#6b7280] mt-0.5">
              This content is used by your web app, mobile app, registration
              terms, and profile privacy consent.
            </p>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className={labelClass}>Policy Set Title</label>
              <input
                value={form.title}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, title: e.target.value }))
                }
                className={`${inputClass} mt-2`}
              />
            </div>

            <div>
              <label className={labelClass}>Version</label>
              <input
                value={form.version}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, version: e.target.value }))
                }
                placeholder="2026-05-06"
                className={`${inputClass} mt-2`}
              />
            </div>

            <div className="md:col-span-2">
              <label className={labelClass}>Description</label>
              <textarea
                rows={3}
                value={form.description}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                className={`${inputClass} mt-2 resize-none`}
              />
            </div>
          </div>
        </div>

        <div className="grid gap-4">
          {form.policies.map((policy, index) => {
            const normalizedKey = String(policy.key || "").trim().toLowerCase();
            const isTerms = normalizedKey === TERMS_KEY;
            const isPrivacy = normalizedKey === PRIVACY_KEY;

            return (
              <div
                key={`${policy.key}-${index}`}
                className={`${panelBg} rounded-[5px] overflow-hidden ${
                  isPrivacy ? "border-black/30" : ""
                }`}
              >
                <div className="px-4 sm:px-5 py-5 border-b border-black/10">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-[5px] bg-[#0A0D17] text-white flex items-center justify-center shrink-0">
                        {isPrivacy ? (
                          <ShieldCheck size={17} />
                        ) : (
                          <FileText size={17} />
                        )}
                      </div>

                      <div>
                        <p className={labelClass}>Policy {index + 1}</p>
                        <h3 className="mt-2 text-xl font-black uppercase tracking-tight text-[#0A0D17]">
                          {policy.title || "Untitled Policy"}
                        </h3>

                        {isPrivacy && (
                          <p className="mt-1 text-[10px] font-black uppercase tracking-[0.14em] text-[#0A0D17]/45">
                            Used as data privacy consent before profile editing.
                          </p>
                        )}

                        {isTerms && (
                          <p className="mt-1 text-[10px] font-black uppercase tracking-[0.14em] text-[#0A0D17]/45">
                            Required before registration and OTP flow.
                          </p>
                        )}
                      </div>
                    </div>

                    {!isTerms && !isPrivacy ? (
                      <button
                        type="button"
                        onClick={() => removePolicy(index)}
                        className={dangerButton}
                      >
                        <Trash2 size={14} />
                        Remove
                      </button>
                    ) : (
                      <div className="w-fit rounded-[5px] border border-black/10 bg-[#FAFAF8] px-3 py-2 text-[10px] font-black uppercase tracking-[0.14em] text-[#0A0D17]/45">
                        Locked
                      </div>
                    )}
                  </div>
                </div>

                <div className="p-4 sm:p-5 space-y-3">
                  <div className={`${softPanelBg} rounded-[5px] p-4`}>
                    <p className={labelClass}>Policy Settings</p>

                    <div className="mt-3 grid gap-3 md:grid-cols-2">
                      <div>
                        <label className={labelClass}>Key</label>
                        <input
                          value={policy.key}
                          disabled={isTerms || isPrivacy}
                          onChange={(e) =>
                            updatePolicyField(index, "key", e.target.value)
                          }
                          placeholder="privacy-policy"
                          className={`${inputClass} mt-2`}
                        />
                      </div>

                      <div>
                        <label className={labelClass}>Title</label>
                        <input
                          value={policy.title}
                          onChange={(e) =>
                            updatePolicyField(index, "title", e.target.value)
                          }
                          className={`${inputClass} mt-2`}
                        />
                      </div>
                    </div>

                    <div className="mt-3 grid gap-3 md:grid-cols-3">
                      <div>
                        <label className={labelClass}>Sort Order</label>
                        <input
                          type="number"
                          value={policy.sortOrder}
                          onChange={(e) =>
                            updatePolicyField(
                              index,
                              "sortOrder",
                              Number(e.target.value)
                            )
                          }
                          className={`${inputClass} mt-2`}
                        />
                      </div>

                      <label className="flex items-center gap-3 rounded-[5px] border border-black/10 bg-white px-4 py-3 mt-0 md:mt-5">
                        <input
                          type="checkbox"
                          checked={isTerms ? true : policy.requiredOnRegister}
                          disabled={isTerms}
                          onChange={(e) =>
                            updatePolicyField(
                              index,
                              "requiredOnRegister",
                              e.target.checked
                            )
                          }
                          className="h-4 w-4 accent-[#0A0D17]"
                        />

                        <span className="text-[11px] font-black uppercase tracking-[0.14em] text-[#0A0D17]">
                          Required on Register
                        </span>
                      </label>

                      <label className="flex items-center gap-3 rounded-[5px] border border-black/10 bg-white px-4 py-3 mt-0 md:mt-5">
                        <input
                          type="checkbox"
                          checked={policy.isActive}
                          disabled={isPrivacy}
                          onChange={(e) =>
                            updatePolicyField(
                              index,
                              "isActive",
                              e.target.checked
                            )
                          }
                          className="h-4 w-4 accent-[#0A0D17]"
                        />

                        <span className="text-[11px] font-black uppercase tracking-[0.14em] text-[#0A0D17]">
                          Active
                        </span>
                      </label>
                    </div>
                  </div>

                  {isPrivacy && (
                    <div className="rounded-[5px] border border-black/10 bg-[#FAFAF8] p-4">
                      <p className={labelClass}>Suggested Privacy Consent Text</p>

                      <p className="mt-2 text-sm font-semibold leading-6 text-[#6b7280]">
                        By editing your profile, you consent to Saint Clothing
                        collecting, updating, and storing your personal
                        information including your name, email, phone number,
                        shipping address, and profile image. This data is used
                        for account management, order processing, delivery,
                        customer support, and security verification.
                      </p>
                    </div>
                  )}

                  <div className={`${softPanelBg} rounded-[5px] p-4`}>
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <p className={labelClass}>Content</p>

                      <button
                        type="button"
                        onClick={() => addTerm(index)}
                        className={buttonLight}
                      >
                        <Plus size={14} />
                        Add Item
                      </button>
                    </div>

                    <div className="space-y-3">
                      {(policy.content || []).map((term, termIndex) => (
                        <div
                          key={termIndex}
                          className="rounded-[5px] border border-black/10 bg-white p-4"
                        >
                          <div className="mb-3 flex items-center justify-between gap-3">
                            <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#0A0D17]">
                              {isTerms
                                ? `Term ${termIndex + 1}`
                                : isPrivacy
                                  ? `Consent ${termIndex + 1}`
                                  : `Item ${termIndex + 1}`}
                            </p>

                            <button
                              type="button"
                              onClick={() => removeTerm(index, termIndex)}
                              className={dangerButton}
                            >
                              <Trash2 size={14} />
                              Remove
                            </button>
                          </div>

                          <div className="grid gap-3">
                            <div>
                              <label className={labelClass}>Title</label>

                              <input
                                value={term.title}
                                onChange={(e) =>
                                  updateTermField(
                                    index,
                                    termIndex,
                                    "title",
                                    e.target.value
                                  )
                                }
                                placeholder={
                                  isPrivacy
                                    ? "Data Privacy Consent for Profile Editing"
                                    : isTerms
                                      ? "Account Responsibility"
                                      : "Policy Item Title"
                                }
                                className={`${inputClass} mt-2`}
                              />
                            </div>

                            <div>
                              <label className={labelClass}>Description</label>

                              <textarea
                                rows={4}
                                value={term.text}
                                onChange={(e) =>
                                  updateTermField(
                                    index,
                                    termIndex,
                                    "text",
                                    e.target.value
                                  )
                                }
                                placeholder={
                                  isPrivacy
                                    ? "By editing your profile, you consent to Saint Clothing collecting, updating, and storing your personal information..."
                                    : isTerms
                                      ? "Users must provide accurate and complete information during registration."
                                      : "Write the content here"
                                }
                                className={`${inputClass} mt-2 resize-none leading-7`}
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {(isTerms || isPrivacy) && (
                    <div className="rounded-[5px] border border-black/10 bg-[#FAFAF8] p-4">
                      <p className={labelClass}>
                        {isPrivacy ? "Privacy Consent Preview" : "Terms Preview"}
                      </p>

                      <div className="mt-3 space-y-3">
                        {(policy.content || []).length > 0 ? (
                          policy.content.map((term, termIndex) => (
                            <div
                              key={termIndex}
                              className="rounded-[5px] border border-black/10 bg-white px-4 py-3"
                            >
                              <p className="text-sm font-black text-[#0A0D17]">
                                {termIndex + 1}.{" "}
                                {term.title ||
                                  (isPrivacy
                                    ? "Untitled Consent"
                                    : "Untitled Term")}
                              </p>

                              <p className="mt-2 text-sm font-semibold leading-6 text-[#6b7280]">
                                {term.text || "No description yet."}
                              </p>
                            </div>
                          ))
                        ) : (
                          <p className="text-sm font-semibold text-gray-400">
                            No content added yet.
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          <button
            type="button"
            onClick={addPolicy}
            className="inline-flex items-center justify-center gap-2 rounded-[5px] border border-dashed border-black/20 bg-white py-4 text-[11px] font-black uppercase tracking-[0.18em] text-[#0A0D17] transition hover:border-black"
          >
            <Plus size={16} />
            Add Policy
          </button>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={savePolicies}
              disabled={saving}
              className={buttonDark}
            >
              <Save size={16} />
              {saving ? "Saving..." : "Save Policies"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PoliciesManager;