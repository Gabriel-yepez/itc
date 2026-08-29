"use client";

import { useState, useSyncExternalStore } from "react";
import { Tab, TabGroup, TabList, TabPanel, TabPanels } from "@headlessui/react";
import SecurityServices from "@/components/SecurityServices";
import SoftwareServices from "@/components/SoftwareServices";

function subscribeToHash(callback: () => void) {
  window.addEventListener("hashchange", callback);
  return () => window.removeEventListener("hashchange", callback);
}

function getHashSnapshot() {
  return window.location.hash.toLowerCase();
}

function getServerSnapshot() {
  return "";
}

export default function ServicesTabs() {
  const hash = useSyncExternalStore(subscribeToHash, getHashSnapshot, getServerSnapshot);
  const [userTab, setUserTab] = useState<number | null>(null);

  const hashTab = hash.includes("seguridad") || hash.includes("security") ? 1 : 0;
  const currentTab = userTab ?? hashTab;

  return (
    <TabGroup
      selectedIndex={currentTab}
      onChange={(index) => setUserTab(index)}
      className="w-full"
    >
      {/* Tab Switcher */}
      <div className="flex justify-center mb-12 sm:mb-16">
        <TabList className="inline-flex rounded-2xl bg-neutral/80 p-1.5 border border-neutral gap-2 shadow-xs">
          {/* Tab 1: Software */}
          <Tab
            className={({ selected }) =>
              `flex items-center gap-2.5 rounded-xl px-6 sm:px-8 py-3 font-label text-xs sm:text-sm font-bold uppercase tracking-wider transition-all outline-none cursor-pointer ${
                selected
                  ? "bg-white text-black shadow-md border border-neutral/60 scale-100"
                  : "text-black hover:bg-white/60 opacity-75 hover:opacity-100"
              }`
            }
          >
            <svg
              className="h-4 w-4 text-primary"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
              />
            </svg>
            <span>Desarrollo & Software</span>
          </Tab>

          {/* Tab 2: Seguridad */}
          <Tab
            className={({ selected }) =>
              `flex items-center gap-2.5 rounded-xl px-6 sm:px-8 py-3 font-label text-xs sm:text-sm font-bold uppercase tracking-wider transition-all outline-none cursor-pointer ${
                selected
                  ? "bg-white text-black shadow-md border border-neutral/60 scale-100"
                  : "text-black hover:bg-white/60 opacity-75 hover:opacity-100"
              }`
            }
          >
            <svg
              className="h-4 w-4 text-secondary"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
              />
            </svg>
            <span>Ciberseguridad & Protección</span>
          </Tab>
        </TabList>
      </div>

      {/* Tab Panels */}
      <TabPanels>
        <TabPanel className="focus:outline-none transition-opacity duration-300">
          <SoftwareServices />
        </TabPanel>
        <TabPanel className="focus:outline-none transition-opacity duration-300">
          <SecurityServices />
        </TabPanel>
      </TabPanels>
    </TabGroup>
  );
}
