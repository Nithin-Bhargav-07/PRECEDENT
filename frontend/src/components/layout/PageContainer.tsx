import React from "react";

export interface PageContainerProps {
  children: React.ReactNode;
  variant?: "wide" | "workspace" | "reading" | "full" | "default";
  className?: string;
}

export const PageContainer: React.FC<PageContainerProps> = ({
  children,
  variant = "default",
  className = "",
}) => {
  let maxWidthClass = "";
  
  switch (variant) {
    case "workspace":
      // ~ 95% of viewport width up to 1800px for maximum side-by-side real estate
      maxWidthClass = "max-w-[95vw] 2xl:max-w-[1800px]";
      break;
    case "wide":
      // ~ 90% of viewport width up to 1600px for cinematic/tabular density
      maxWidthClass = "max-w-[90vw] 2xl:max-w-[1600px]";
      break;
    case "reading":
      // standard reading wrapper (max-w-7xl = 1280px)
      maxWidthClass = "max-w-7xl";
      break;
    case "full":
      maxWidthClass = "max-w-full";
      break;
    case "default":
    default:
      maxWidthClass = "max-w-[90vw] 2xl:max-w-[1500px]";
      break;
  }

  return (
    <div className={`mx-auto ${maxWidthClass} px-4 sm:px-6 lg:px-8 ${className}`}>
      {children}
    </div>
  );
};
