import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface PlatformSocials {
  youtube: string;
  facebook: string;
  instagram: string;
  linkedin?: string;
  phone?: string;
  custom_brochure_url?: string;
  custom_pamphlet_url?: string;
}

export const DEFAULT_PLATFORM_SOCIALS: PlatformSocials = {
  youtube: "https://www.youtube.com/@AassayBiz",
  facebook: "https://www.facebook.com/aassaybiz",
  instagram: "https://www.instagram.com/aassaybiz",
  linkedin: "https://www.linkedin.com/company/aassaybiz",
  phone: "+91 7806025875",
  custom_brochure_url: "https://api.aassaybiz.com/storage/v1/object/public/portal-ads/collateral/official_brochure_1790759572464.pdf",
  custom_pamphlet_url: "",
};

const STORAGE_KEY = "assaybiz_platform_socials";
const EVENT_KEY = "platform-socials-updated";

/**
 * Normalizes input handle/URL into a full clickable URL.
 * Supports inputs like "@assaybiz", "assaybiz", or full "https://..."
 */
export function formatSocialUrl(type: "youtube" | "facebook" | "instagram" | "linkedin", value?: string): string {
  if (!value) return "";
  const trimmed = value.trim();
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }
  const clean = trimmed.replace(/^@/, "");
  switch (type) {
    case "youtube":
      return `https://www.youtube.com/@${clean}`;
    case "facebook":
      return `https://www.facebook.com/${clean}`;
    case "instagram":
      return `https://www.instagram.com/${clean}`;
    case "linkedin":
      if (clean.startsWith("company/") || clean.startsWith("in/")) {
        return `https://www.linkedin.com/${clean}`;
      }
      return `https://www.linkedin.com/company/${clean}`;
    default:
      return trimmed;
  }
}

/**
 * Saves platform socials to Supabase and broadcasts changes in real time.
 */
export async function savePlatformSocials(socials: PlatformSocials): Promise<{ success: boolean; error?: string }> {
  try {
    const payload = JSON.stringify(socials);

    // 1. Cache in localStorage immediately
    try {
      localStorage.setItem(STORAGE_KEY, payload);
    } catch (_) {}

    // 2. Broadcast to local windows/listeners
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent(EVENT_KEY, { detail: socials }));
    }

    // 3. Upsert into portal_ads with is_active: true so anonymous users can read it
    const { data: existing } = await supabase
      .from("portal_ads")
      .select("id")
      .eq("title", "__platform_socials__")
      .maybeSingle();

    if (existing?.id) {
      try {
        await supabase
          .from("portal_ads")
          .update({
            link_url: payload,
            is_active: false,
            image_url: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
            updated_at: new Date().toISOString()
          })
          .eq("id", existing.id);
      } catch {
        await supabase
          .from("portal_ads")
          .update({
            link_url: payload,
            is_active: false,
            image_url: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="
          })
          .eq("id", existing.id);
      }
    } else {
      await supabase
        .from("portal_ads")
        .insert([{
          title: "__platform_socials__",
          image_url: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
          link_url: payload,
          is_active: false,
          sort_order: 9999
        }]);
    }

    // 4. Save to platform_settings table
    const settingsEntries = [
      { key: "social_youtube", value: socials.youtube || "" },
      { key: "social_facebook", value: socials.facebook || "" },
      { key: "social_instagram", value: socials.instagram || "" },
      { key: "social_linkedin", value: socials.linkedin || "" },
      { key: "social_phone", value: socials.phone || "" },
      { key: "custom_brochure_url", value: socials.custom_brochure_url || "" },
    ];

    for (const item of settingsEntries) {
      try {
        await supabase
          .from("platform_settings")
          .upsert({ key: item.key, value: item.value, updated_at: new Date().toISOString() }, { onConflict: "key" });
      } catch (_) {}
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to save social links" };
  }
}

/**
 * Hook to consume official AssayBiz social media handles anywhere in the app.
 */
export function usePlatformSocials() {
  const [socials, setSocials] = useState<PlatformSocials>(() => {
    try {
      const cached = localStorage.getItem(STORAGE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        return { ...DEFAULT_PLATFORM_SOCIALS, ...parsed };
      }
    } catch (_) {}
    return DEFAULT_PLATFORM_SOCIALS;
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    // Listen for live updates on the same window
    const handleLiveUpdate = (e: any) => {
      if (e.detail) {
        setSocials((prev) => ({ ...prev, ...e.detail }));
      }
    };
    window.addEventListener(EVENT_KEY, handleLiveUpdate);

    async function loadSocials() {
      try {
        // Try reading from portal_ads config
        const { data: adConfig } = await supabase
          .from("portal_ads")
          .select("link_url")
          .eq("title", "__platform_socials__")
          .maybeSingle();

        if (adConfig?.link_url) {
          try {
            const parsed = JSON.parse(adConfig.link_url);
            if (isMounted) {
              const merged = {
                youtube: parsed.youtube || DEFAULT_PLATFORM_SOCIALS.youtube,
                facebook: parsed.facebook || DEFAULT_PLATFORM_SOCIALS.facebook,
                instagram: parsed.instagram || DEFAULT_PLATFORM_SOCIALS.instagram,
                linkedin: parsed.linkedin || DEFAULT_PLATFORM_SOCIALS.linkedin,
                phone: parsed.phone || DEFAULT_PLATFORM_SOCIALS.phone,
                custom_brochure_url: parsed.custom_brochure_url || "",
                custom_pamphlet_url: parsed.custom_pamphlet_url || "",
              };
              setSocials(merged);
              localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
              setLoading(false);
              return;
            }
          } catch (e) {}
        }

        // Fallback: check individual platform_settings
        const { data: settingsData } = await supabase
          .from("platform_settings")
          .select("key, value")
          .in("key", [
            "social_youtube",
            "social_facebook",
            "social_instagram",
            "social_linkedin",
            "social_phone",
            "custom_brochure_url",
            "custom_pamphlet_url",
          ]);

        if (settingsData && settingsData.length > 0) {
          const map: Record<string, string> = {};
          settingsData.forEach((s) => {
            map[s.key] = s.value;
          });
          if (isMounted) {
            const merged = {
              youtube: map.social_youtube || DEFAULT_PLATFORM_SOCIALS.youtube,
              facebook: map.social_facebook || DEFAULT_PLATFORM_SOCIALS.facebook,
              instagram: map.social_instagram || DEFAULT_PLATFORM_SOCIALS.instagram,
              linkedin: map.social_linkedin || DEFAULT_PLATFORM_SOCIALS.linkedin,
              phone: map.social_phone || DEFAULT_PLATFORM_SOCIALS.phone,
              custom_brochure_url: map.custom_brochure_url || "",
              custom_pamphlet_url: map.custom_pamphlet_url || "",
            };
            setSocials(merged);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
          }
        }
      } catch (err) {
        // Keep defaults on network error
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadSocials();

    return () => {
      isMounted = false;
      window.removeEventListener(EVENT_KEY, handleLiveUpdate);
    };
  }, []);

  return {
    socials,
    loading,
    formatSocialUrl: (type: "youtube" | "facebook" | "instagram" | "linkedin") =>
      formatSocialUrl(type, socials[type]),
  };
}
