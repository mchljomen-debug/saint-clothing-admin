import React, { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { backendUrl } from "../App";
import { FileText, Plus, Save, Trash2 } from "lucide-react";

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
        updatedBy: localStorage.getItem("role") || "admin",
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
        headers: { token },
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
      <div className="rounded-[24px] border border-black/10 bg-white p-8 text-center text-sm font-semibold text-gray-500">
        Loading policies...
      </div>
    );
  }

  return (
    <div className="font-['Outfit']">
      <div className="mb-6 pt-[80px] rounded-[28px] border border-black/10 bg-white/70 p-6 shadow-[0_10px_30px_rgba(0,0,0,0.04)] backdrop-blur-md">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-4">
            <div className="rounded-2xl bg-[#0A0D17] p-3 text-white">
              <FileText size={22} />
            </div>

            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.28em] text-gray-500">
                Policy Content Manager
              </p>

              <h1 className="mt-2 text-3xl font-black italic uppercase tracking-tight text-[#0A0D17]">
                Policies
              </h1>

              <p className="mt-2 max-w-2xl text-sm font-medium text-gray-500">
                Edit the live policy content used in the web page, mobile page,
                registration terms, and profile privacy consent.
              </p>
            </div>
          </div>

          <button
            onClick={savePolicies}
            disabled={saving}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#0A0D17] px-5 py-3 text-[11px] font-black uppercase tracking-[0.18em] text-white transition hover:opacity-90 disabled:opacity-50"
          >
            <Save size={16} />
            {saving ? "Saving..." : "Save Policies"}
          </button>
        </div>
      </div>

      <div className="grid gap-6">
        <div className="rounded-[24px] border border-black/10 bg-white p-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.22em] text-gray-500">
                Policy Set Title
              </label>

              <input
                value={form.title}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, title: e.target.value }))
                }
                className="w-full rounded-2xl border border-black/10 bg-[#FAFAF8] px-4 py-3 font-semibold text-[#0A0D17] outline-none focus:border-black"
              />
            </div>

            <div>
              <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.22em] text-gray-500">
                Version
              </label>

              <input
                value={form.version}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, version: e.target.value }))
                }
                placeholder="2026-05-02"
                className="w-full rounded-2xl border border-black/10 bg-[#FAFAF8] px-4 py-3 font-semibold text-[#0A0D17] outline-none focus:border-black"
              />
            </div>
          </div>

          <div className="mt-4">
            <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.22em] text-gray-500">
              Description
            </label>

            <textarea
              rows={3}
              value={form.description}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, description: e.target.value }))
              }
              className="w-full rounded-2xl border border-black/10 bg-[#FAFAF8] px-4 py-3 font-semibold text-[#0A0D17] outline-none focus:border-black"
            />
          </div>
        </div>

        {form.policies.map((policy, index) => {
          const normalizedKey = String(policy.key || "").trim().toLowerCase();
          const isTerms = normalizedKey === TERMS_KEY;
          const isPrivacy = normalizedKey === PRIVACY_KEY;

          return (
            <div
              key={`${policy.key}-${index}`}
              className={`rounded-[24px] border bg-white p-6 ${
                isPrivacy ? "border-black/30" : "border-black/10"
              }`}
            >
              <div className="mb-4 flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-black uppercase tracking-[0.18em] text-[#0A0D17]">
                    Policy {index + 1}
                  </p>

                  {isPrivacy && (
                    <p className="mt-1 text-[10px] font-black uppercase tracking-[0.16em] text-gray-500">
                      Used as data privacy consent before profile editing.
                    </p>
                  )}

                  {isTerms && (
                    <p className="mt-1 text-[10px] font-black uppercase tracking-[0.16em] text-gray-400">
                      Terms are shown as number + title + description.
                    </p>
                  )}
                </div>

                {!isTerms && !isPrivacy ? (
                  <button
                    onClick={() => removePolicy(index)}
                    className="inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-rose-600"
                  >
                    <Trash2 size={14} />
                    Remove
                  </button>
                ) : (
                  <div className="rounded-xl border border-black/10 bg-[#FAFAF8] px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-gray-500">
                    Locked
                  </div>
                )}
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.22em] text-gray-500">
                    Key
                  </label>

                  <input
                    value={policy.key}
                    disabled={isTerms || isPrivacy}
                    onChange={(e) =>
                      updatePolicyField(index, "key", e.target.value)
                    }
                    placeholder="privacy-policy"
                    className="w-full rounded-2xl border border-black/10 bg-[#FAFAF8] px-4 py-3 font-semibold text-[#0A0D17] outline-none focus:border-black disabled:cursor-not-allowed disabled:opacity-70"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.22em] text-gray-500">
                    Title
                  </label>

                  <input
                    value={policy.title}
                    onChange={(e) =>
                      updatePolicyField(index, "title", e.target.value)
                    }
                    className="w-full rounded-2xl border border-black/10 bg-[#FAFAF8] px-4 py-3 font-semibold text-[#0A0D17] outline-none focus:border-black"
                  />
                </div>
              </div>

              <div className="mt-4 grid gap-4 md:grid-cols-3">
                <div>
                  <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.22em] text-gray-500">
                    Sort Order
                  </label>

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
                    className="w-full rounded-2xl border border-black/10 bg-[#FAFAF8] px-4 py-3 font-semibold text-[#0A0D17] outline-none focus:border-black"
                  />
                </div>

                <label className="flex items-center gap-3 rounded-2xl border border-black/10 bg-[#FAFAF8] px-4 py-3">
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
                  />

                  <span className="text-[11px] font-black uppercase tracking-[0.14em] text-[#0A0D17]">
                    Required on Register
                  </span>
                </label>

                <label className="flex items-center gap-3 rounded-2xl border border-black/10 bg-[#FAFAF8] px-4 py-3">
                  <input
                    type="checkbox"
                    checked={policy.isActive}
                    disabled={isPrivacy}
                    onChange={(e) =>
                      updatePolicyField(index, "isActive", e.target.checked)
                    }
                  />

                  <span className="text-[11px] font-black uppercase tracking-[0.14em] text-[#0A0D17]">
                    Active
                  </span>
                </label>
              </div>

              {isPrivacy && (
                <div className="mt-4 rounded-2xl border border-black/10 bg-[#FAFAF8] p-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#0A0D17]">
                    Suggested Privacy Consent Text
                  </p>

                  <p className="mt-2 text-sm font-semibold leading-6 text-gray-600">
                    By editing your profile, you consent to Saint Clothing
                    collecting, updating, and storing your personal information
                    including your name, email, phone number, shipping address,
                    and profile image. This data is used for account management,
                    order processing, delivery, customer support, and security
                    verification.
                  </p>
                </div>
              )}

              <div className="mt-4">
                <div className="mb-3 flex items-center justify-between">
                  <label className="block text-[10px] font-black uppercase tracking-[0.22em] text-gray-500">
                    Content
                  </label>

                  <button
                    type="button"
                    onClick={() => addTerm(index)}
                    className="inline-flex items-center gap-2 rounded-xl border border-black/10 bg-[#FAFAF8] px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-[#0A0D17]"
                  >
                    <Plus size={14} />
                    Add Item
                  </button>
                </div>

                <div className="space-y-4">
                  {(policy.content || []).map((term, termIndex) => (
                    <div
                      key={termIndex}
                      className="rounded-2xl border border-black/10 bg-[#FAFAF8] p-4"
                    >
                      <div className="mb-3 flex items-center justify-between">
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
                          className="inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-rose-600"
                        >
                          <Trash2 size={14} />
                          Remove
                        </button>
                      </div>

                      <div className="grid gap-3">
                        <div>
                          <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.18em] text-gray-500">
                            Title
                          </label>

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
                            className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 font-semibold text-[#0A0D17] outline-none focus:border-black"
                          />
                        </div>

                        <div>
                          <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.18em] text-gray-500">
                            Description
                          </label>

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
                            className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 font-medium leading-7 text-[#0A0D17] outline-none focus:border-black"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {(isTerms || isPrivacy) && (
                  <div className="mt-4 rounded-2xl border border-black/10 bg-[#FAFAF8] p-4">
                    <p className="mb-3 text-[10px] font-black uppercase tracking-[0.18em] text-gray-500">
                      {isPrivacy ? "Privacy Consent Preview" : "Terms Preview"}
                    </p>

                    <div className="space-y-3">
                      {(policy.content || []).length > 0 ? (
                        policy.content.map((term, termIndex) => (
                          <div
                            key={termIndex}
                            className="rounded-xl border border-black/10 bg-white px-4 py-3"
                          >
                            <p className="text-sm font-black text-[#0A0D17]">
                              {termIndex + 1}.{" "}
                              {term.title ||
                                (isPrivacy
                                  ? "Untitled Consent"
                                  : "Untitled Term")}
                            </p>

                            <p className="mt-2 text-sm font-semibold leading-6 text-gray-600">
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
          onClick={addPolicy}
          className="inline-flex items-center justify-center gap-2 rounded-[20px] border border-dashed border-black/20 bg-white py-4 text-[11px] font-black uppercase tracking-[0.18em] text-[#0A0D17] transition hover:border-black"
        >
          <Plus size={16} />
          Add Policy
        </button>
      </div>
    </div>
  );
};

export default PoliciesManager;