import { PageHeader } from "@/components/page-header";
import { AvailabilityChecker } from "./checker";

export default function AvailabilityPage() {
  return (
    <>
      <PageHeader
        title="Availability check"
        description="Choose a time window to see each resource, confirmed booking clashes, and related enquiries."
      />
      <AvailabilityChecker />
    </>
  );
}
