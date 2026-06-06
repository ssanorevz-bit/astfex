import { redirect } from "next/navigation";

export const metadata = {
  title: "Thai DR Compare",
  description: "Compare Thai DRs by same underlying or investment theme"
};

export default function DrNewWatchlistPage() {
  redirect("/dr-new/compare");
}
