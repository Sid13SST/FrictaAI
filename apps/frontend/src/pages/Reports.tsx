import { FileText, Download } from 'lucide-react';

export const Reports = () => {
  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">UX Reports</h1>
          <p className="text-foreground/60 mt-1">Detailed analysis of workflow friction and usability issues.</p>
        </div>
        <button className="bg-card hover:bg-card/80 border border-border px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center">
          <Download className="w-4 h-4 mr-2" /> Export All
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-card border border-border p-6 rounded-xl space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-primary/10 rounded-lg text-primary">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold">Checkout Optimization</h3>
                  <p className="text-xs text-foreground/50">Generated 2 days ago</p>
                </div>
              </div>
              <span className="text-sm font-bold text-yellow-500 bg-yellow-500/10 px-2 py-1 rounded-md">Score: 68</span>
            </div>
            
            <p className="text-sm text-foreground/70 leading-relaxed">
              Agent encountered friction during the payment step. The CVC field was not clearly marked, leading to a 12-second hesitation before input.
            </p>
            
            <div className="pt-4 border-t border-border flex justify-end">
              <button className="text-sm text-primary hover:underline font-medium">View Full Analysis</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
