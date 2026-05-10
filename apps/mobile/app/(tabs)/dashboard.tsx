import { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Link } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../lib/auth';
import { colors, fonts, radii, statusColor } from '../../lib/theme';
import { usePaginatedList } from '../../lib/use-paginated-list';
import { ViewToggle, type ViewMode } from '../../components/view-toggle';

type SearchView = {
  id: string;
  name: string;
  keywords: string[];
  cronLabel: string;
  status: string;
  lastRun: string;
  nextRun: string;
  results: number;
};

type ApiPage = {
  jobs: SearchView[];
  items?: SearchView[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
};

export default function Dashboard() {
  const { user, signout } = useAuth();
  const [view, setView] = useState<ViewMode>('list');

  const { items, refreshing, loadingMore, hasMore, refresh, loadMore } =
    usePaginatedList<SearchView, ApiPage>({
      path: '/searches',
      pageSize: 20,
      getItems: (d) => d.items ?? d.jobs,
    });

  const isGrid = view === 'grid';

  return (
    <View style={s.container}>
      <View style={s.appTop}>
        <View style={{ flex: 1 }}>
          <Text style={s.h2}>Scrape Yard</Text>
          <Text style={s.topSub}>
            {items.length} JOB{items.length === 1 ? '' : 'S'} · {user?.email}
          </Text>
        </View>
        <ViewToggle value={view} onChange={setView} />
        <Pressable style={s.iconBtn} onPress={refresh}>
          <Ionicons name="refresh" size={15} color={colors.fg} />
        </Pressable>
        <Pressable style={s.iconBtn} onPress={signout}>
          <Ionicons name="log-out-outline" size={15} color={colors.fg} />
        </Pressable>
      </View>

      <FlatList
        key={view /* force re-mount when columns change */}
        data={items}
        keyExtractor={(i) => i.id}
        numColumns={isGrid ? 2 : 1}
        columnWrapperStyle={isGrid ? s.columnWrap : undefined}
        contentContainerStyle={[
          s.listPad,
          isGrid && { paddingHorizontal: 8 },
        ]}
        refreshControl={
          <RefreshControl refreshing={refreshing} tintColor={colors.fg} onRefresh={refresh} />
        }
        onEndReachedThreshold={0.5}
        onEndReached={loadMore}
        renderItem={({ item }) => (isGrid ? <GridCard item={item} /> : <ListCard item={item} />)}
        ListEmptyComponent={
          !refreshing ? (
            <View style={s.empty}>
              <View style={s.emptyIcon}>
                <Ionicons name="folder-open-outline" size={20} color={colors.fgMuted} />
              </View>
              <Text style={s.emptyTitle}>No jobs yet</Text>
              <Text style={s.emptyText}>Tap the + to create your first scrape job.</Text>
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

      <View style={s.fab} pointerEvents="none">
        <Ionicons name="add" size={22} color={colors.accentFg} />
      </View>
    </View>
  );
}

function ListCard({ item }: { item: SearchView }) {
  const tone = statusColor(item.status);
  return (
    <Link href={{ pathname: '/(tabs)/search/[id]', params: { id: item.id } }} asChild>
      <Pressable style={s.card}>
        <View style={s.cardHead}>
          <Text style={s.cardTitle}>{item.name}</Text>
          <View style={s.pill}>
            <View style={[s.pillDot, { backgroundColor: tone.dot }]} />
            <Text style={[s.pillText, { color: tone.text }]}>{tone.label}</Text>
          </View>
        </View>
        <View style={s.kwRow}>
          {item.keywords.slice(0, 4).map((k) => (
            <View key={k} style={s.kwChip}>
              <Text style={s.kwText}>{k}</Text>
            </View>
          ))}
          {item.keywords.length > 4 && (
            <Text style={[s.kwText, { color: colors.fgSubtle, alignSelf: 'center' }]}>
              +{item.keywords.length - 4}
            </Text>
          )}
        </View>
        <View style={s.metaRow}>
          <Text style={s.metaItem}>
            <Text style={s.metaLabel}>cron </Text>
            {item.cronLabel.toLowerCase()}
          </Text>
          <Text style={s.metaItem}>
            <Text style={s.metaLabel}>last </Text>
            {item.lastRun}
          </Text>
          <Text style={s.metaItem}>
            <Text style={s.metaLabel}>next </Text>
            {item.nextRun}
          </Text>
        </View>
      </Pressable>
    </Link>
  );
}

function GridCard({ item }: { item: SearchView }) {
  const tone = statusColor(item.status);
  return (
    <Link href={{ pathname: '/(tabs)/search/[id]', params: { id: item.id } }} asChild>
      <Pressable style={s.gridCard}>
        <View style={s.gridCardHead}>
          <Text numberOfLines={2} style={s.gridTitle}>
            {item.name}
          </Text>
          <View style={s.pill}>
            <View style={[s.pillDot, { backgroundColor: tone.dot }]} />
          </View>
        </View>
        <Text style={s.gridResults}>
          {item.results} <Text style={s.gridResultsLabel}>RESULTS</Text>
        </Text>
        <View style={s.gridKwRow}>
          {item.keywords.slice(0, 2).map((k) => (
            <View key={k} style={s.kwChip}>
              <Text style={s.kwText} numberOfLines={1}>
                {k}
              </Text>
            </View>
          ))}
          {item.keywords.length > 2 && (
            <Text style={[s.kwText, { color: colors.fgSubtle }]}>
              +{item.keywords.length - 2}
            </Text>
          )}
        </View>
        <Text style={[s.metaItem, { marginTop: 8 }]}>{item.cronLabel.toLowerCase()}</Text>
      </Pressable>
    </Link>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  appTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg,
  },
  h2: { fontSize: 18, fontFamily: fonts.sansSemibold, color: colors.fg, letterSpacing: -0.2 },
  topSub: {
    fontFamily: fonts.mono,
    fontSize: 11,
    color: colors.fgSubtle,
    marginTop: 2,
    letterSpacing: 0.4,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgElev,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listPad: { padding: 12, paddingBottom: 120, gap: 8 },
  columnWrap: { gap: 8, paddingHorizontal: 4 },
  card: {
    backgroundColor: colors.bgElev,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.card,
    padding: 16,
    gap: 12,
  },
  cardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 },
  cardTitle: { fontSize: 15, fontFamily: fonts.sansSemibold, color: colors.fg, flex: 1, letterSpacing: -0.15 },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgElev,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 4,
  },
  pillDot: { width: 6, height: 6, borderRadius: 3 },
  pillText: { fontFamily: fonts.monoMedium, fontSize: 11 },
  kwRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  kwChip: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgSunk,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 4,
  },
  kwText: { fontFamily: fonts.mono, fontSize: 11, color: colors.fg },
  metaRow: {
    flexDirection: 'row',
    gap: 16,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    borderStyle: 'dashed',
  },
  metaItem: { fontFamily: fonts.mono, fontSize: 11, color: colors.fgMuted },
  metaLabel: { color: colors.fgSubtle },

  gridCard: {
    flex: 1,
    minHeight: 150,
    backgroundColor: colors.bgElev,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.card,
    padding: 12,
    margin: 4,
    gap: 8,
  },
  gridCardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 6 },
  gridTitle: { fontSize: 13, fontFamily: fonts.sansSemibold, color: colors.fg, flex: 1, letterSpacing: -0.1 },
  gridResults: { fontSize: 22, fontFamily: fonts.sansSemibold, color: colors.fg },
  gridResultsLabel: { fontSize: 10, fontFamily: fonts.mono, color: colors.fgSubtle, letterSpacing: 0.6 },
  gridKwRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 2 },

  empty: { padding: 48, alignItems: 'center' },
  emptyIcon: {
    width: 48,
    height: 48,
    borderRadius: radii.container,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgSunk,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: { fontSize: 14, fontFamily: fonts.sansMedium, color: colors.fg, marginBottom: 4 },
  emptyText: { fontSize: 12, color: colors.fgMuted, textAlign: 'center', maxWidth: 240, lineHeight: 18 },
  footerEnd: {
    textAlign: 'center',
    paddingVertical: 24,
    fontFamily: fonts.mono,
    fontSize: 10,
    color: colors.fgSubtle,
    letterSpacing: 0.6,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 100,
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
});
