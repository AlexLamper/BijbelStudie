// Dashboard component commented out - Study page is now the default
export function RecentNotesCard() {
  return null;
}

/*
  highlightColor: string;
  tags: string[];
  type: "note" | "highlight" | "both";
  createdAt: string;
}

interface RecentNotesCardProps {
}

export const RecentNotesCard = React.memo(function RecentNotesCard({ }: RecentNotesCardProps) {
  const { data: session } = useSession();
  const { t } = useTranslation("notes");
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRecentNotes = async () => {
      if (!session?.user) return;

      try {
        setLoading(true);
        const response = await fetch("/api/notes?limit=5&page=1");
        
        if (!response.ok) {
          throw new Error("Failed to fetch notes");
        }

        const data = await response.json();
        setNotes(data.notes || []);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    };

    fetchRecentNotes();
  }, [session?.user]); // Only re-fetch when user changes

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

    if (diffInDays === 0) return "Today";
    if (diffInDays === 1) return "Yesterday";
    if (diffInDays < 7) return `${diffInDays} days ago`;
    return date.toLocaleDateString(lng, { month: "short", day: "numeric" });
  };

  const truncateText = (text: string, maxLength: number = 80) => {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength) + "...";
  };

  if (!session) return null;

  return (
  <Card className="border rounded-lg shadow-[0_2px_8px_-2px_rgba(0,0,0,0.1),0_4px_16px_-4px_rgba(0,0,0,0.1)] hover:shadow-[0_4px_12px_-2px_rgba(0,0,0,0.15),0_8px_24px_-4px_rgba(0,0,0,0.1)] transition-shadow duration-300 border-border dark:bg-[#23263a]">
      <CardContent className="px-4 py-4 sm:px-6 sm:py-6">
        <div className="flex items-center justify-between mb-4 gap-2">
          <h3 className="text-lg  font-semibold text-foreground">{t("recent_notes_title")}</h3>
          <Link href={`/notes`}>
            <Button variant="ghost" size="sm" className=" text-[#798777] font-medium hover:bg-[#798777]/10 dark:text-[#9aaa98] dark:hover:bg-[#9aaa98]/10">
              {t("view_all")}
            </Button>
          </Link>
        </div>
        {loading && (
          <div className="flex justify-center py-8">
            <div className="animate-spin h-6 w-6 border-b-2 border-[#798777] dark:border-[#9aaa98]"></div>
          </div>
        )}

        {error && (
          <div className="text-center py-8">
            <p className=" text-red-600 dark:text-red-400 text-sm">{error}</p>
          </div>
        )}

        {!loading && !error && notes.length === 0 && (
          <div className="text-center py-8">
            <StickyNote className="h-8 w-8 text-gray-400 mx-auto mb-3" />
            <p className=" text-muted-foreground text-sm mb-3">
              {t("no_notes_yet")}
            </p>
            <Link href={`/study`}>
              <Button size="sm" variant="outline">
                {t("start_taking_notes")}
              </Button>
            </Link>
          </div>
        )}

        {!loading && !error && notes.length > 0 && (
          <div className="space-y-3">
            {notes.map((note) => (
              <div
                key={note._id}
                className="bg-gray-50 dark:bg-[#1a1d2a] p-3 border border-border hover:shadow-[0_2px_4px_-1px_rgba(0,0,0,0.1),0_4px_8px_-2px_rgba(0,0,0,0.05)] transition-shadow duration-200"
              >
                <div className="flex items-start justify-between mb-2">
                  <p className=" font-medium text-foreground">{note.verseReference}</p>
                  <p className=" text-xs text-muted-foreground">{formatDate(note.createdAt)}</p>
                </div>
                
                <p className=" text-sm text-gray-700 dark:text-gray-300 mb-2">
                  {truncateText(note.noteText)}
                </p>
                
                {note.tags.length > 0 && (
                  <div className="flex gap-1">
                    {note.tags.slice(0, 2).map((tag, index) => (
                      <Badge key={index} variant="outline" className="text-xs border-gray-300 bg-gray-100 text-gray-700">
                        #{tag}
                      </Badge>
                    ))}
                    {note.tags.length > 2 && (
                      <Badge variant="outline" className="text-xs border-gray-300 bg-gray-100 text-gray-700">
                        +{note.tags.length - 2}
                      </Badge>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <Button
          variant="outline"
          size="sm"
          className="mt-4 w-full  text-[#798777] border-[#798777]/30 bg-white dark:bg-[#23263a] dark:border-[#9aaa98]/30 dark:text-[#9aaa98] py-2 hover:bg-[#798777]/10 dark:hover:bg-[#9aaa98]/10"
        >
          {t("new_note_button")}
        </Button>
      </CardContent>
    </Card>
  );
});
*/
