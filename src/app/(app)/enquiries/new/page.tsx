import { PageHeader } from "@/components/page-header";
import { EnquiryForm } from "./enquiry-form";

export default function NewEnquiryPage() {
  return (
    <>
      <PageHeader title="New enquiry" description="Capture a customer enquiry — convert later when ready." />
      <EnquiryForm />
    </>
  );
}
