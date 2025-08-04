"use client";

import { useEffect, useState } from "react";
import { Moon, Sun, Menu, UserCircle, LogOut, ChevronDown, Plane } from "lucide-react";
import { getFlightRequests, updateFlightRequestStatus, updateFlightRequestTraveler, updateFlightRequestSearchQuery } from "./actions/flightRequests";
import ViewFlightRequestModal, { FlightRequest } from "@/components/ViewFlightRequestModal";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Drawer, DrawerContent, DrawerTrigger } from "@/components/ui/drawer";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import toast from "react-hot-toast";
import Link from "next/link";

const STATUS_OPTIONS = [
  { value: "active", label: "Active", color: "bg-blue-500" },
  { value: "held", label: "Held", color: "bg-amber-500" },
  { value: "queued", label: "Queued", color: "bg-purple-500" },
  { value: "success", label: "Success", color: "bg-green-500" },
  { value: "error", label: "Error", color: "bg-red-500" },
];

const FILTER_OPTIONS = [
  { value: "All", label: "All" },
  ...STATUS_OPTIONS.map(opt => ({
    value: opt.value.charAt(0).toUpperCase() + opt.value.slice(1),
    label: opt.label,
  })),
];

export default function DashboardPage() {
  const { theme, setTheme } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [requests, setRequests] = useState<FlightRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("All");
  const [selected, setSelected] = useState<FlightRequest | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const data = await getFlightRequests(filter);
      setRequests(data);
    } catch (err) {
      toast.error("Failed to fetch flight requests");
      setRequests([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [filter]);

  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      setRequests((reqs) =>
        reqs.map((r) => (r.id === id ? { ...r, status: newStatus } : r))
      );
      const { success, data } = await updateFlightRequestStatus(id, newStatus);
      if (success) {
        setRequests((reqs) =>
          reqs.map((r) => (r.id === id ? data : r))
        );
        toast.success("Status updated successfully");
      }
    } catch (err) {
      toast.error("Failed to update status");
      await fetchData(); // Revert by refetching
    }
  };

  const handleUpdateTraveler = async (id: string, travelerInfo: any[]) => {
    try {
      setRequests((reqs) =>
        reqs.map((r) => (r.id === id ? { ...r, traveler_info: travelerInfo } : r))
      );
      const { success, data } = await updateFlightRequestTraveler(id, travelerInfo);
      if (success) {
        setRequests((reqs) =>
          reqs.map((r) => (r.id === id ? data : r))
        );
        toast.success("Traveler info updated successfully");
      }
    } catch (err) {
      toast.error("Failed to update traveler info");
      await fetchData(); // Revert by refetching
    }
  };

  const handleUpdateSearchQuery = async (id: string, searchQuery: any) => {
    try {
      setRequests((reqs) =>
        reqs.map((r) => (r.id === id ? { ...r, search_query: searchQuery } : r))
      );
      const { success, data } = await updateFlightRequestSearchQuery(id, searchQuery);
      if (success) {
        setRequests((reqs) =>
          reqs.map((r) => (r.id === id ? data : r))
        );
        toast.success("Search query updated successfully");
      }
    } catch (err) {
      toast.error("Failed to update search query");
      await fetchData(); // Revert by refetching
    }
  };

  return (
    <div
      className={`min-h-screen ${
        theme === "dark"
          ? "bg-gray-900 text-gray-100"
          : "bg-gray-50 text-gray-900"
      } font-inter`}
    >
      {/* Navbar */}
      <nav
        className={`sticky top-0 z-30 flex items-center justify-between px-6 py-4 shadow-lg ${
          theme === "dark" ? "bg-gray-950" : "bg-white"
        }`}
      >
        <div className="flex items-center gap-2">
          <Drawer open={sidebarOpen} onOpenChange={setSidebarOpen}>
            <DrawerTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Open sidebar"
                className="mr-2 md:hidden"
              >
                <Menu />
              </Button>
            </DrawerTrigger>
            <DrawerContent
              className={`${
                theme === "dark" ? "bg-gray-950" : "bg-white"
              } p-4`}
            >
              <SidebarContent onClose={() => setSidebarOpen(false)} />
            </DrawerContent>
          </Drawer>
          <Plane className="h-7 w-7 text-indigo-600" />
          <span className="ml-2 font-bold text-xl tracking-tight">
            SeatTracker
          </span>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Toggle theme"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="transition"
          >
            {theme === "dark" ? <Sun /> : <Moon />}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Open profile menu"
              >
                <UserCircle className="h-7 w-7" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>Profile</DropdownMenuItem>
              <DropdownMenuItem>Settings</DropdownMenuItem>
              <DropdownMenuItem className="text-red-500 flex items-center gap-2">
                <LogOut className="h-4 w-4" /> Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </nav>

      {/* Main Layout */}
      <div className="flex min-h-[calc(100vh-72px)]">
        {/* Sidebar (desktop) */}
        <aside
          className={`hidden md:flex flex-col w-56 px-4 py-8 ${
            theme === "dark"
              ? "bg-gray-950 border-r border-gray-800"
              : "bg-white border-r border-gray-200"
          }`}
        >
          <SidebarContent />
        </aside>

        {/* Main Content */}
        <main className="flex-1 px-2 md:px-8 py-6 transition-all">
          {/* Dashboard header */}
          <div className="mb-8 flex flex-col md:flex-row md:items-end md:justify-between gap-6">
            <div>
              <h1 className="text-3xl md:text-4xl font-semibold mb-2 tracking-tight">
                Flight Requests
              </h1>
              <p className="text-muted-foreground text-base">
                Monitor and manage your tracked flights in a modern dashboard.
              </p>
            </div>
            {/* Table Filters/Actions */}
            <div className="flex gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-2"
                  >
                    {FILTER_OPTIONS.find((opt) => opt.value === filter)?.label || "Filter"} <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {FILTER_OPTIONS.map(opt => (
                    <DropdownMenuItem
                      key={opt.value}
                      onClick={() => setFilter(opt.value)}
                      className={filter === opt.value ? "bg-indigo-100 dark:bg-indigo-900 font-semibold" : ""}
                    >
                      {opt.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              <Link href="/new">
        <Button variant="default" size="sm">
          New Request
        </Button>
      </Link>
            </div>
          </div>

          {/* Data Table in Card */}
          <Card
            className={`p-0 shadow-xl overflow-hidden ${
              theme === "dark" ? "bg-gray-950" : "bg-white"
            }`}
          >
            <div className={`overflow-x-auto`}>
              <Table>
                <TableHeader
                  className={`${
                    theme === "dark" ? "bg-gray-800" : "bg-blue-50"
                  } transition-all`}
                >
                  <TableRow>
                    <TableHead className="px-6 py-4">Booking Class</TableHead>
                    <TableHead className="px-6 py-4">PNR</TableHead>
                    <TableHead className="px-6 py-4">Status</TableHead>
                    <TableHead className="px-6 py-4">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    Array.from({ length: 6 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell colSpan={5}>
                          <Skeleton className="h-8 w-full" />
                        </TableCell>
                      </TableRow>
                    ))
                  ) : requests.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="py-8 text-center text-muted-foreground"
                      >
                        No flight requests found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    requests.map((req, i) => (
                      <TableRow
                        key={req.id}
                        className={`transition hover:bg-indigo-50 dark:hover:bg-indigo-950 ${
                          i % 2 === 0
                            ? theme === "dark"
                              ? "bg-gray-900"
                              : "bg-gray-100"
                            : theme === "dark"
                              ? "bg-gray-950"
                              : "bg-white"
                        }`}
                      >
                        <TableCell className="px-6 py-4 font-mono font-medium">
                          {req.target_booking_classes}
                        </TableCell>
                        <TableCell className="px-6 py-4">
                          {req.pnr_number ?? (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="px-6 py-4">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className={`rounded-full px-3 py-1 capitalize transition ${STATUS_OPTIONS.find(
                                  (opt) => opt.value === req.status
                                )?.color} text-white`}
                              >
                                {STATUS_OPTIONS.find((opt) => opt.value === req.status)?.label ||
                                  req.status}
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                              {STATUS_OPTIONS.map((opt) => (
                                <DropdownMenuItem
                                  key={opt.value}
                                  onClick={() => handleStatusChange(req.id, opt.value)}
                                  className="flex items-center gap-2"
                                >
                                  <span
                                    className={`inline-block w-2 h-2 rounded-full ${opt.color}`}
                                  ></span>
                                  {opt.label}
                                </DropdownMenuItem>
                              ))}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                        <TableCell className="px-6 py-4">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setSelected(req)}
                          >
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>

          {/* Modal for selected flight request */}
          <ViewFlightRequestModal
            open={!!selected}
            onOpenChange={(v) => !v && setSelected(null)}
            flightRequest={selected}
            onUpdateStatus={handleStatusChange}
            onUpdateTraveler={handleUpdateTraveler}
            onUpdateSearchQuery={handleUpdateSearchQuery}
          />
        </main>
      </div>
    </div>
  );
}

function SidebarContent({ onClose }: { onClose?: () => void }) {
  return (
    <nav className="flex flex-col gap-2">
      <Button
        variant="ghost"
        className="justify-start w-full text-left"
        onClick={onClose}
      >
        Dashboard
      </Button>
      <Button
        variant="ghost"
        className="justify-start w-full text-left"
        onClick={onClose}
      >
        Requests
      </Button>
      <Button
        variant="ghost"
        className="justify-start w-full text-left"
        onClick={onClose}
      >
        Settings
      </Button>
      <Button
        variant="ghost"
        className="justify-start w-full text-left"
        onClick={onClose}
      >
        Help
      </Button>
    </nav>
  );
}