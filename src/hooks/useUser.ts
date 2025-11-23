import { useState, useEffect } from "react";
import { User } from "firebase/auth";
import { PlatformUser, getCachedUserData } from "@/services/userService";

export const useUser = (firebaseUser: User | null) => {
  const [platformUser, setPlatformUser] = useState<PlatformUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUserData = async () => {
      if (!firebaseUser) {
        setPlatformUser(null);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const userData = await getCachedUserData(firebaseUser.uid);
        setPlatformUser(userData);
      } catch (err) {
        console.error("Error fetching user data:", err);
        setError(err instanceof Error ? err.message : "Error desconocido");
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [firebaseUser]);

  return { platformUser, loading, error };
};
