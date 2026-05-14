import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../../lib/api';
import { colors, fonts, radii } from '../../../lib/theme';
import { ViewToggle, type ViewMode } from '../../../components/view-toggle';
import { pickThumbnail, siteFavicon, type Thumb as ThumbKind } from '../../../lib/thumbnails';

type Result = {
  id: string;
  source: string;
  title: string;
  url: string;
  snippet: string | null;
  image: string | null;
  tag: string | null;
  time: string | null;
};

type ResultsPage = {
  job: { id: string; name: string; keywords: string[]; lastRun: string; strict: boolean };
  results: Result[];
  items?: Result[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
};

const PAGE_SIZE = 25;

export default function SearchResults() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [job, setJob] = useState<ResultsPage['job'] | null>(null);
  const [items, setItems] = useState<Result[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [running, setRunning] = useState(false);
  const [filter, setFilter] = useState('');
  const [filtering, setFiltering] = useState(false);
  const [view, setView] = useState<ViewMode>('list');
  const [strictSaving, setStrictSaving] = useState(false);

  const fetchPage = useCallback(
    async (p: number, replace: boolean) => {
      if (!id) return;
      const out = await api.get<ResultsPage>(
        `/searches/${id}/results?page=${p}&pageSize=${PAGE_SIZE}`,
      );
      const next = out.items ?? out.results;
      setJob(out.job);
      setItems((prev) => (replace ? next : [...prev, ...next]));
      setPage(p);
      setHasMore(out.hasMore);
    },
    [id],
  );

  useEffect(() => {
    setLoading(true);
    fetchPage(1, true).finally(() => setLoading(false));
  }, [fetchPage]);

  async function refresh() {
    setRefreshing(true);
    try {
      await fetchPage(1, true);
    } finally {
      setRefreshing(false);
    }
  }

  async function loadMore() {
    if (!hasMore || refreshing || loadingMore) return;
    setLoadingMore(true);
    try {
      await fetchPage(page + 1, false);
    } finally {
      setLoadingMore(false);
    }
  }

  async function runNow() {
    if (!id) return;
    setRunning(true);
    try {
      await api.post(`/searches/${id}/run`);
      setTimeout(refresh, 1500);
    } finally {
      setRunning(false);
    }
  }

  async function toggleStrict(next: boolean) {
    if (!id || !job) return;
    const prev = job.strict;
    setJob({ ...job, strict: next });
    setStrictSaving(true);
    try {
      await api.patch(`/searches/${id}`, { strict: next });
    } catch (e) {
      setJob({ ...job, strict: prev });
      Alert.alert('Could not update', (e as Error).message);
    } finally {
      setStrictSaving(false);
    }
  }

  function explainStrict() {
    Alert.alert(
      'Strict mode',
      'When on, this crawl only keeps results that contain ALL of your keywords (in the title or snippet). When off, a result matching any single keyword is kept. Strict mode is applied on the next run.',
    );
  }

  async function applyFilter() {
    if (!id || !filter.trim()) return;
    setFiltering(true);
    try {
      const out = await api.post<{ results: Result[] }>(`/searches/${id}/filter`, {
        prompt: filter.trim(),
      });
      setItems(out.results);
      setHasMore(false); // server-side filter returns the whole filtered set
      setFilter('');
    } finally {
      setFiltering(false);
    }
  }

  const isGrid = view === 'grid';

  if (loading || !job) {
    return (
      <View style={[s.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator color={colors.fg} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={s.container}
    >
      <Stack.Screen
        options={{
          title: job.name,
          headerStyle: { backgroundColor: colors.bg },
          headerTitleStyle: { fontFamily: fonts.sansSemibold, fontSize: 16 },
        }}
      />

      <FlatList
        key={view}
        data={items}
        keyExtractor={(i) => i.id}
        numColumns={isGrid ? 2 : 1}
        columnWrapperStyle={isGrid ? s.columnWrap : undefined}
        contentContainerStyle={[{ paddingBottom: 140 }, isGrid && { paddingHorizontal: 8 }]}
        ListHeaderComponent={
          <View style={s.headerWrap}>
            <Text style={s.title}>{job.name}</Text>
            <Text style={s.sub}>
              {job.keywords.length} KEYWORDS · LAST RUN {job.lastRun.toUpperCase()}
            </Text>
            <View style={s.kwRow}>
              {job.keywords.map((k) => (
                <View key={k} style={s.kwChip}>
                  <Text style={s.kwText}>{k}</Text>
                </View>
              ))}
            </View>
            <View style={s.strictRow}>
              <View style={s.strictLabelWrap}>
                <Text style={s.strictLabel}>Strict mode</Text>
                <Pressable
                  onPress={explainStrict}
                  hitSlop={8}
                  accessibilityLabel="What is strict mode?"
                  accessibilityRole="button"
                >
                  <Ionicons
                    name="information-circle-outline"
                    size={15}
                    color={colors.fgMuted}
                  />
                </Pressable>
              </View>
              <Switch
                value={job.strict}
                onValueChange={toggleStrict}
                disabled={strictSaving}
                trackColor={{ false: colors.border, true: colors.accent }}
                thumbColor={colors.accentFg}
              />
            </View>
            <View style={s.headerActions}>
              <Pressable
                style={[s.runBtn, running && { opacity: 0.5 }]}
                onPress={runNow}
                disabled={running}
              >
                {running ? (
                  <ActivityIndicator color={colors.accentFg} />
                ) : (
                  <>
                    <Ionicons name="play" size={13} color={colors.accentFg} />
                    <Text style={s.runBtnText}>Run now</Text>
                  </>
                )}
              </Pressable>
              <ViewToggle value={view} onChange={setView} />
            </View>
          </View>
        }
        refreshControl={
          <RefreshControl refreshing={refreshing} tintColor={colors.fg} onRefresh={refresh} />
        }
        onEndReachedThreshold={0.5}
        onEndReached={loadMore}
        renderItem={({ item }) =>
          isGrid ? <GridResultCard item={item} /> : <ListResultRow item={item} />
        }
        ItemSeparatorComponent={
          isGrid ? undefined : () => <View style={{ height: 1, backgroundColor: colors.border }} />
        }
        ListEmptyComponent={
          !refreshing ? (
            <View style={{ padding: 48, alignItems: 'center' }}>
              <Text style={{ color: colors.fgMuted, fontFamily: fonts.sans, fontSize: 13 }}>
                No results yet — try Run now.
              </Text>
            </View>
          ) : null
        }
        ListFooterComponent={
          loadingMore ? (
            <View style={{ paddingVertical: 24 }}>
              <ActivityIndicator color={colors.fg} />
            </View>
          ) : !hasMore && items.length > 0 ? (
            <Text style={s.footerEnd}>END · {items.length} TOTAL</Text>
          ) : null
        }
      />

      <View style={s.filterBar}>
        <TextInput
          style={s.filterInput}
          value={filter}
          onChangeText={setFilter}
          placeholder="Filter prompt — e.g. only Series A or later"
          placeholderTextColor={colors.fgSubtle}
          multiline
        />
        <Pressable
          style={[s.send, (!filter.trim() || filtering) && { opacity: 0.3 }]}
          onPress={applyFilter}
          disabled={!filter.trim() || filtering}
        >
          {filtering ? (
            <ActivityIndicator color={colors.accentFg} />
          ) : (
            <Ionicons name="sparkles" size={16} color={colors.accentFg} />
          )}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

function Thumb({
  item,
  width,
  height,
  style,
}: {
  item: { image: string | null; url: string };
  width: number;
  height: number;
  style?: any;
}) {
  // Downgrade on image-load failure: cover → site favicon → striped box.
  const initial = pickThumbnail(item);
  const [thumb, setThumb] = useState<ThumbKind>(initial);

  if (thumb.kind === 'none') {
    return (
      <View style={[{ width, height }, s.thumb, style]}>
        <Text style={s.thumbLabel}>IMG</Text>
      </View>
    );
  }

  const isSite = thumb.kind === 'site';
  return (
    <View
      style={[
        {
          width,
          height,
          borderRadius: radii.control,
          backgroundColor: colors.bgSunk,
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        },
        style,
      ]}
    >
      <Image
        source={{ uri: thumb.src }}
        onError={() => {
          if (thumb.kind === 'cover') {
            const fav = siteFavicon(item.url);
            setThumb(fav ? { kind: 'site', src: fav } : { kind: 'none' });
          } else {
            setThumb({ kind: 'none' });
          }
        }}
        style={
          isSite
            ? { width: Math.min(40, width - 16), height: Math.min(40, height - 16) }
            : { width: '100%', height: '100%' }
        }
        resizeMode={isSite ? 'contain' : 'cover'}
      />
    </View>
  );
}

function ListResultRow({ item }: { item: Result }) {
  return (
    <Pressable style={s.resultCard} onPress={() => Linking.openURL(item.url)}>
      <Thumb item={item} width={76} height={76} />
      <View style={{ flex: 1, gap: 5, minWidth: 0 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={s.resultSource}>{item.source.toUpperCase()}</Text>
          {item.tag && (
            <View style={s.resultTag}>
              <Text style={s.resultTagText}>{item.tag}</Text>
            </View>
          )}
        </View>
        <Text style={s.resultTitle} numberOfLines={2}>
          {item.title}
        </Text>
        {item.snippet && (
          <Text style={s.resultSnippet} numberOfLines={2}>
            {item.snippet}
          </Text>
        )}
        {item.time && <Text style={s.resultFoot}>{item.time}</Text>}
      </View>
    </Pressable>
  );
}

function GridResultCard({ item }: { item: Result }) {
  return (
    <Pressable
      style={s.gridResultCard}
      onPress={() => Linking.openURL(item.url)}
    >
      <Thumb item={item} width={140} height={90} style={s.gridThumb} />
      <Text style={s.gridSource}>{item.source.toUpperCase()}</Text>
      <Text style={s.gridResultTitle} numberOfLines={3}>
        {item.title}
      </Text>
      {item.time && <Text style={s.resultFoot}>{item.time}</Text>}
    </Pressable>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  headerWrap: { padding: 20, gap: 8, borderBottomWidth: 1, borderColor: colors.border },
  title: { fontSize: 20, fontFamily: fonts.sansSemibold, color: colors.fg, letterSpacing: -0.3 },
  sub: { fontFamily: fonts.mono, fontSize: 11, color: colors.fgSubtle, letterSpacing: 0.4 },
  kwRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  kwChip: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgSunk,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 4,
  },
  kwText: { fontFamily: fonts.mono, fontSize: 11, color: colors.fg },
  headerActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },
  strictRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    borderStyle: 'dashed',
  },
  strictLabelWrap: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  strictLabel: {
    fontFamily: fonts.sansMedium,
    fontSize: 13,
    color: colors.fg,
  },
  runBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.accent,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: radii.lg,
  },
  runBtnText: { color: colors.accentFg, fontSize: 13, fontFamily: fonts.sansMedium },
  resultCard: {
    flexDirection: 'row',
    gap: 14,
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: colors.bg,
  },
  thumb: {
    width: 76,
    height: 76,
    borderRadius: radii.control,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgSunk,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbLabel: { fontFamily: fonts.mono, fontSize: 9, color: colors.fgSubtle, letterSpacing: 1 },
  resultSource: { fontFamily: fonts.mono, fontSize: 10, color: colors.fgMuted, letterSpacing: 0.6 },
  resultTag: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgElev,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 3,
  },
  resultTagText: { fontFamily: fonts.mono, fontSize: 9, color: colors.fg, letterSpacing: 0.4 },
  resultTitle: {
    fontSize: 14,
    fontFamily: fonts.sansMedium,
    color: colors.fg,
    lineHeight: 19,
    letterSpacing: -0.1,
  },
  resultSnippet: { fontSize: 12, color: colors.fgMuted, lineHeight: 18, fontFamily: fonts.sans },
  resultFoot: { fontFamily: fonts.mono, fontSize: 10, color: colors.fgSubtle },
  filterBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    backgroundColor: colors.bgElev,
    borderTopWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 28,
  },
  filterInput: {
    flex: 1,
    minHeight: 40,
    maxHeight: 120,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    backgroundColor: colors.bg,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontFamily: fonts.sans,
    fontSize: 13,
    color: colors.fg,
  },
  send: {
    width: 40,
    height: 40,
    borderRadius: radii.lg,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  columnWrap: { gap: 8, paddingHorizontal: 4 },
  gridResultCard: {
    flex: 1,
    minHeight: 180,
    margin: 4,
    backgroundColor: colors.bgElev,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.card,
    padding: 12,
    gap: 6,
  },
  gridThumb: {
    width: '100%',
    height: 90,
    borderRadius: radii.control,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgSunk,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  gridSource: { fontFamily: fonts.mono, fontSize: 9, color: colors.fgMuted, letterSpacing: 0.6 },
  gridResultTitle: { fontSize: 12, fontFamily: fonts.sansMedium, color: colors.fg, lineHeight: 16 },
  footerEnd: {
    textAlign: 'center',
    paddingVertical: 24,
    fontFamily: fonts.mono,
    fontSize: 10,
    color: colors.fgSubtle,
    letterSpacing: 0.6,
  },
});
