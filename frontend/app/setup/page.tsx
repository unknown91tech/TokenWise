import { SetupGuide } from '../components/SetupGuide';

export default function SetupPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8">
        <SetupGuide />
      </div>
    </div>
  );
}