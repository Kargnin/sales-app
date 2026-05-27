import * as React from "react"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"
import { SwipeableContainer } from "./SwipeableContainer"

export interface TabItem {
  value: string;
  label: string;
  count?: number;
}

export interface SwipeableTabsProps {
  tabs: TabItem[];
  activeTab: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
  hideHeader?: boolean;
}

export const SwipeableTabs: React.FC<SwipeableTabsProps> = ({
  tabs,
  activeTab,
  onChange,
  children,
  className,
  contentClassName,
  hideHeader = false,
}) => {
  const prevTabRef = React.useRef<string>(activeTab);
  const [direction, setDirection] = React.useState<'right' | 'left' | null>(null);

  React.useEffect(() => {
    if (activeTab !== prevTabRef.current) {
      const prevIndex = tabs.findIndex((t) => t.value === prevTabRef.current);
      const newIndex = tabs.findIndex((t) => t.value === activeTab);
      if (prevIndex !== -1 && newIndex !== -1) {
        setDirection(newIndex > prevIndex ? 'right' : 'left');
      }
      prevTabRef.current = activeTab;
    }
  }, [activeTab, tabs]);

  const handleSwipeLeft = () => {
    const currentIndex = tabs.findIndex((t) => t.value === activeTab);
    if (currentIndex !== -1 && currentIndex < tabs.length - 1) {
      onChange(tabs[currentIndex + 1].value);
    }
  };

  const handleSwipeRight = () => {
    const currentIndex = tabs.findIndex((t) => t.value === activeTab);
    if (currentIndex !== -1 && currentIndex > 0) {
      onChange(tabs[currentIndex - 1].value);
    }
  };

  const animationClass = direction === 'right' 
    ? 'animate-tab-right' 
    : direction === 'left' 
    ? 'animate-tab-left' 
    : '';

  return (
    <div className={cn("flex flex-col gap-4 w-full select-none", className)}>
      {!hideHeader && (
        <Tabs value={activeTab} onValueChange={onChange} className="w-full">
          <TabsList className="w-full flex bg-[#090d0a] border border-[#17221b] p-1 rounded-xl h-11">
            {tabs.map((tab) => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className={cn(
                  "flex-1 text-xs font-bold uppercase tracking-wider h-full rounded-lg transition-all duration-200",
                  activeTab === tab.value
                    ? "bg-[#e1fd52] text-[#090d0a] shadow-lg shadow-lime-500/10"
                    : "text-slate-400 hover:text-slate-200"
                )}
              >
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span className={cn(
                    "ml-1.5 text-[10px] py-0.5 px-1.5 rounded-full font-sans font-extrabold",
                    activeTab === tab.value 
                      ? "bg-[#090d0a]/10 text-[#090d0a]" 
                      : "bg-[#17221b] text-slate-400"
                  )}>
                    {tab.count}
                  </span>
                )}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      )}

      {/* Gestured content container using the generic SwipeableContainer */}
      <SwipeableContainer
        key={activeTab}
        onSwipeLeft={handleSwipeLeft}
        onSwipeRight={handleSwipeRight}
        contentClassName={cn(animationClass, contentClassName)}
      >
        {children}
      </SwipeableContainer>
    </div>
  );
};

