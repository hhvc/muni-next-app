import { useEffect, useState } from "react";
import { auth } from "@/firebase/clientApp";

const useAuth = () => {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (auth) {
      setIsReady(true);
    } else {
      // Intentar nuevamente después de un tiempo
      const timer = setTimeout(() => {
        if (auth) setIsReady(true);
      }, 500);

      return () => clearTimeout(timer);
    }
  }, []);

  return {
    auth,
    isReady,
  };
};

export default useAuth;
