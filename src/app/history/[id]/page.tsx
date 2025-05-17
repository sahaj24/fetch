import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { supabase } from '@/supabase/config';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { formatDate } from '@/utils/date';

export const metadata: Metadata = {
  title: 'History Detail | Fetch',
  description: 'View details of your extraction history',
};

async function getHistoryItem(id: string) {
  const { data, error } = await supabase
    .from('history')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) {
    return null;
  }

  return data;
}

export default async function HistoryDetailPage({ params }: { params: { id: string } }) {
  const historyItem = await getHistoryItem(params.id);

  if (!historyItem) {
    notFound();
  }

  return (
    <div className="container py-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">History Detail</h1>
        
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Extraction Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h3 className="font-medium text-sm text-muted-foreground">Title</h3>
                <p className="text-lg">{historyItem.title || 'Untitled'}</p>
              </div>
              
              <Separator />
              
              <div>
                <h3 className="font-medium text-sm text-muted-foreground">URL</h3>
                <p className="text-sm break-all">{historyItem.url}</p>
              </div>
              
              <Separator />
              
              <div>
                <h3 className="font-medium text-sm text-muted-foreground">Processed On</h3>
                <p>{formatDate(historyItem.created_at)}</p>
              </div>
              
              <Separator />
              
              <div>
                <h3 className="font-medium text-sm text-muted-foreground">Content</h3>
                <div className="mt-2 p-4 bg-muted rounded-md">
                  <pre className="whitespace-pre-wrap">{historyItem.content}</pre>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}