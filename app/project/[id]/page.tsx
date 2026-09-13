// The editor lives in app/generation/page.tsx and reads its project id from
// useParams(), so this route renders the same component under /project/<uuid>.
// Re-exporting avoids moving a 4000-line file; the trade-off is that the
// implementation still sits under app/generation/.
export { default } from '@/app/generation/page';
