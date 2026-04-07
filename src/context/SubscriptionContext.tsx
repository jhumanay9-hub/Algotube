"use client";

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
} from "react";
import { getApiUrl } from "@/lib/config";

interface SubscriptionContextType {
  subscribedCreators: Set<number>;
  isSubscribed: (creatorId: number) => boolean;
  toggleSubscription: (creatorId: number) => Promise<boolean>;
  refreshSubscriptions: (userId: string) => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextType>({
  subscribedCreators: new Set(),
  isSubscribed: () => false,
  toggleSubscription: async () => false,
  refreshSubscriptions: async () => {},
});

export function SubscriptionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [subscribedCreators, setSubscribedCreators] = useState<Set<number>>(
    new Set(),
  );

  // Refresh subscriptions from database
  const refreshSubscriptions = useCallback(async (userId: string) => {
    try {
      const apiUrl = getApiUrl("subscribe.php", { user_id: userId });
      console.log("[SubscriptionContext] Fetching from:", apiUrl);

      const res = await fetch(apiUrl);

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`HTTP ${res.status}: ${errorText}`);
      }

      const data = await res.json();
      if (Array.isArray(data)) {
        const creatorIds = new Set(data.map((sub: any) => sub.creator_id));
        setSubscribedCreators(creatorIds);
      }
    } catch (e: any) {
      console.error(
        "[SubscriptionContext] Failed to refresh subscriptions:",
        e.message,
      );
      if (e.name === "TypeError" && e.message.includes("fetch")) {
        console.error(
          "[SubscriptionContext] Network/CORS error - check if Apache is running and CORS headers are correct",
        );
      }
    }
  }, []);

  // Check if user is subscribed to a creator
  const isSubscribed = useCallback(
    (creatorId: number) => {
      return subscribedCreators.has(creatorId);
    },
    [subscribedCreators],
  );

  // Toggle subscription (subscribe/unsubscribe)
  const toggleSubscription = useCallback(
    async (creatorId: number): Promise<boolean> => {
      try {
        const res = await fetch(getApiUrl("subscribe.php"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ follower_id: 1, creator_id: creatorId }), // TODO: Use actual user ID
        });

        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const data = await res.json();

        // Update local state immediately
        setSubscribedCreators((prev) => {
          const next = new Set(prev);
          if (data.subscribed) {
            next.add(creatorId);
          } else {
            next.delete(creatorId);
          }
          return next;
        });

        return data.subscribed;
      } catch (e) {
        console.error(
          "[SubscriptionContext] Failed to toggle subscription:",
          e,
        );
        return false;
      }
    },
    [],
  );

  return (
    <SubscriptionContext.Provider
      value={{
        subscribedCreators,
        isSubscribed,
        toggleSubscription,
        refreshSubscriptions,
      }}
    >
      {children}
    </SubscriptionContext.Provider>
  );
}

export const useSubscriptions = () => useContext(SubscriptionContext);
