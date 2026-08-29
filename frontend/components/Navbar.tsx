import { getGlobal } from "@/lib/cms/queries";
import NavbarClient from "./NavbarClient";

export default async function Navbar() {
  const global = await getGlobal();

  return <NavbarClient navLinks={global?.navLinks} logo={global?.logo} />;
}
