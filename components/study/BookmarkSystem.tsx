'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { ScrollArea } from '../ui/scroll-area';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Bookmark, BookmarkCheck, Edit, Trash2, Search, Tag } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../ui/dialog';

interface BookmarkItem {
  id: string;
  translation: string;
  translationName: string;
  book: string;
  chapter: number;
  verse?: number;
  text: string;
  note?: string;
  tags: string[];
  createdAt: Date;
}

interface BookmarkSystemProps {
  currentTranslation: string;
  currentTranslationName: string;
  currentBook: string;
  currentChapter: number;
  selectedVerse?: number;
  verseText?: string;
  t: (key: string) => string;
}

export default function BookmarkSystem({
  currentTranslation,
  currentTranslationName,
  currentBook,
  currentChapter,
  selectedVerse,
  verseText,
  t
}: BookmarkSystemProps) {
  const [bookmarks, setBookmarks] = useState<BookmarkItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isAddingBookmark, setIsAddingBookmark] = useState(false);
  const [editingBookmark, setEditingBookmark] = useState<BookmarkItem | null>(null);
  const [bookmarkNote, setBookmarkNote] = useState('');
  const [bookmarkTags, setBookmarkTags] = useState('');

  // Load bookmarks from localStorage on mount
  useEffect(() => {
    const savedBookmarks = localStorage.getItem('bijbelstudie-bookmarks');
    if (savedBookmarks) {
      try {
        const parsed = JSON.parse(savedBookmarks).map((b: Omit<BookmarkItem, 'createdAt'> & { createdAt: string }) => ({
          ...b,
          createdAt: new Date(b.createdAt)
        }));
        setBookmarks(parsed);
      } catch (error) {
        console.error('Error loading bookmarks:', error);
      }
    }
  }, []);

  // Save bookmarks to localStorage whenever bookmarks change
  useEffect(() => {
    localStorage.setItem('bijbelstudie-bookmarks', JSON.stringify(bookmarks));
  }, [bookmarks]);

  const isCurrentPassageBookmarked = () => {
    return bookmarks.some(b => 
      b.translation === currentTranslation &&
      b.book === currentBook &&
      b.chapter === currentChapter &&
      (selectedVerse ? b.verse === selectedVerse : !b.verse)
    );
  };

  const addBookmark = () => {
    const newBookmark: BookmarkItem = {
      id: Date.now().toString(),
      translation: currentTranslation,
      translationName: currentTranslationName,
      book: currentBook,
      chapter: currentChapter,
      verse: selectedVerse,
      text: verseText || `${currentBook} ${currentChapter}`,
      note: bookmarkNote,
      tags: bookmarkTags.split(',').map(tag => tag.trim()).filter(Boolean),
      createdAt: new Date()
    };

    setBookmarks(prev => [newBookmark, ...prev]);
    setIsAddingBookmark(false);
    setBookmarkNote('');
    setBookmarkTags('');
  };

  const removeBookmark = (id: string) => {
    setBookmarks(prev => prev.filter(b => b.id !== id));
  };

  const updateBookmark = (updatedBookmark: BookmarkItem) => {
    setBookmarks(prev => prev.map(b => 
      b.id === updatedBookmark.id ? updatedBookmark : b
    ));
    setEditingBookmark(null);
  };

  const toggleCurrentBookmark = () => {
    if (isCurrentPassageBookmarked()) {
      const bookmarkToRemove = bookmarks.find(b => 
        b.translation === currentTranslation &&
        b.book === currentBook &&
        b.chapter === currentChapter &&
        (selectedVerse ? b.verse === selectedVerse : !b.verse)
      );
      if (bookmarkToRemove) {
        removeBookmark(bookmarkToRemove.id);
      }
    } else {
      setIsAddingBookmark(true);
    }
  };

  const getAllTags = () => {
    const tags = new Set<string>();
    bookmarks.forEach(b => b.tags.forEach(tag => tags.add(tag)));
    return Array.from(tags).sort();
  };

  const filteredBookmarks = bookmarks.filter(bookmark => {
    const matchesSearch = searchQuery === '' || 
      bookmark.text.toLowerCase().includes(searchQuery.toLowerCase()) ||
      bookmark.book.toLowerCase().includes(searchQuery.toLowerCase()) ||
      bookmark.note?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesTags = selectedTags.length === 0 ||
      selectedTags.some(tag => bookmark.tags.includes(tag));
    
    return matchesSearch && matchesTags;
  });

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  return (
    <div className="space-y-4">
      {/* Header with Add Bookmark Button */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">{t('bookmarks')}</h3>
        <Button
          onClick={toggleCurrentBookmark}
          variant={isCurrentPassageBookmarked() ? "default" : "outline"}
          size="sm"
        >
          {isCurrentPassageBookmarked() ? (
            <>
              <BookmarkCheck className="h-4 w-4 mr-2" />
              {t('remove_bookmark')}
            </>
          ) : (
            <>
              <Bookmark className="h-4 w-4 mr-2" />
              {t('add_bookmark')}
            </>
          )}
        </Button>
      </div>

      {/* Search and Filter */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search bookmarks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        
        {/* Tag Filter */}
        {getAllTags().length > 0 && (
          <div className="flex flex-wrap gap-2">
            {getAllTags().map(tag => (
              <Badge
                key={tag}
                variant={selectedTags.includes(tag) ? "default" : "secondary"}
                className="cursor-pointer"
                onClick={() => toggleTag(tag)}
              >
                <Tag className="h-3 w-3 mr-1" />
                {tag}
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* Bookmarks List */}
      <ScrollArea className="h-96">
        <div className="space-y-3">
          {filteredBookmarks.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                {bookmarks.length === 0 
                  ? "No bookmarks yet. Start by bookmarking your favorite passages!"
                  : "No bookmarks match your search criteria."
                }
              </CardContent>
            </Card>
          ) : (
            filteredBookmarks.map(bookmark => (
              <Card key={bookmark.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium">
                      {bookmark.book} {bookmark.chapter}
                      {bookmark.verse && `:${bookmark.verse}`}
                    </CardTitle>
                    <div className="flex items-center gap-1">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                            <Edit className="h-3 w-3" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Edit Bookmark</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div>
                              <label className="text-sm font-medium">Note</label>
                              <Textarea
                                value={editingBookmark?.note || ''}
                                onChange={(e) => setEditingBookmark(prev => 
                                  prev ? { ...prev, note: e.target.value } : null
                                )}
                                placeholder="Add a personal note..."
                                className="mt-1"
                              />
                            </div>
                            <div>
                              <label className="text-sm font-medium">Tags (comma-separated)</label>
                              <Input
                                value={editingBookmark?.tags.join(', ') || ''}
                                onChange={(e) => setEditingBookmark(prev => 
                                  prev ? { 
                                    ...prev, 
                                    tags: e.target.value.split(',').map(tag => tag.trim()).filter(Boolean)
                                  } : null
                                )}
                                placeholder="prayer, worship, salvation..."
                                className="mt-1"
                              />
                            </div>
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="outline"
                                onClick={() => setEditingBookmark(null)}
                              >
                                Cancel
                              </Button>
                              <Button
                                onClick={() => editingBookmark && updateBookmark(editingBookmark)}
                              >
                                Save
                              </Button>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeBookmark(bookmark.id)}
                        className="h-6 w-6 p-0 text-destructive"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {bookmark.translationName} • {bookmark.createdAt.toLocaleDateString()}
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-sm mb-2">{bookmark.text}</p>
                  {bookmark.note && (
                    <p className="text-xs text-muted-foreground italic mb-2">{bookmark.note}</p>
                  )}
                  {bookmark.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {bookmark.tags.map(tag => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </ScrollArea>

      {/* Add Bookmark Dialog */}
      <Dialog open={isAddingBookmark} onOpenChange={setIsAddingBookmark}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Bookmark</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium mb-2">Passage:</p>
              <p className="text-sm text-muted-foreground">
                {currentBook} {currentChapter}
                {selectedVerse && `:${selectedVerse}`} ({currentTranslationName})
              </p>
              {verseText && (
                <p className="text-sm mt-2 p-2 bg-muted rounded">{verseText}</p>
              )}
            </div>
            <div>
              <label className="text-sm font-medium">Note (optional)</label>
              <Textarea
                value={bookmarkNote}
                onChange={(e) => setBookmarkNote(e.target.value)}
                placeholder="Add a personal note about this passage..."
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Tags (optional, comma-separated)</label>
              <Input
                value={bookmarkTags}
                onChange={(e) => setBookmarkTags(e.target.value)}
                placeholder="prayer, worship, salvation..."
                className="mt-1"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setIsAddingBookmark(false);
                  setBookmarkNote('');
                  setBookmarkTags('');
                }}
              >
                Cancel
              </Button>
              <Button onClick={addBookmark} className="bg-teal-600 hover:bg-teal-700 text-white rounded-lg">
                Add Bookmark
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

