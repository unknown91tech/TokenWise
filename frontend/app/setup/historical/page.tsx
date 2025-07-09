import { HistoricalDataManager } from '../../components/HistoricalDataManager';

export default function HistoricalDataPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8">
        <HistoricalDataManager />
      </div>
    </div>
  );
}