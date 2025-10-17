// import FileUploader from "@/components/ui/FileUploader";
// import {PageHeading} from "@/components/ui/Structure";
import UploadClient from "./KnowledgeBaseClient"
import {requireAuth} from "@/lib/auth/require-auth";

export default async function Page() {
	await requireAuth();

	return <UploadClient/>

	// return (
	// 	<div className="p-8 flex flex-col gap-6">
	// 		<PageHeading title={"Upload"} description={"This page is for uploading files to generate embedding, and save to database."}/>
	// 		<FileUploader />
	// 	</div>
	// );
}