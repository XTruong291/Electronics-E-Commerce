import { useState, useEffect } from "react";
import { Grid } from "antd";

/**
 * Custom responsive hook for XìMiStore
 * Resolves Ant Design's initial render {} issue to prevent flash of mobile layout on desktop
 */
export const useResponsive = () => {
  const screens = Grid.useBreakpoint();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const hasScreens = Object.keys(screens).length > 0;

  const isMobile = hasScreens
    ? !screens.md
    : mounted && typeof window !== "undefined"
    ? window.innerWidth < 768
    : false;

  const isTablet = hasScreens
    ? !screens.lg
    : mounted && typeof window !== "undefined"
    ? window.innerWidth < 992
    : false;

  const isSmallMobile = hasScreens
    ? !screens.sm
    : mounted && typeof window !== "undefined"
    ? window.innerWidth < 576
    : false;

  return {
    screens,
    isMobile,
    isTablet,
    isTabletOrMobile: isTablet,
    isSmallMobile,
  };
};

export default useResponsive;

