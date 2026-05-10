import { useState } from 'react';
import {
  ActivityIndicator,
  Alert as RNAlert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../lib/api';
import { colors, fonts, radii } from '../../lib/theme';
import { usePaginatedList } from '../../lib/use-paginated-list';
import { ViewToggle, type ViewMode } from '../../components/view-toggle';

type Frequency = 'REALTIME' | 'HOURLY' | 'DAILY';

type AlertItem = {
  id: string;
  keyword: string;
  sources: string[];
  locations: string[];
  frequency: Frequency;
  active: boolean;
  lastTriggered: string | null;
};

type ApiPage = {
  alerts: AlertItem[];
  items?: AlertItem[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
};

export default function AlertsScreen() {
  const [view, setView] = useState<ViewMode>('list');
  const [keyword, setKeyword] = useState('');
  const [frequency, setFrequency] = useState<Frequency>('DAILY');
  const [busy, setBusy] = useState<string | null>(null);

  const {
    items,
    setItems,
    refreshing,
    loadingMore,
    hasMore,
    refresh,
    loadMore,
  } = usePaginatedList<AlertItem, ApiPage>({
    path: '/alerts',
    pageSize: 20,
    getItems: (d) => d.items ?? d.alerts,
  });

  async function create() {
    if (!keyword.trim()) return;
    setBusy('create');
    try {
      const created = await api.post<AlertItem>('/alerts', {
        keyword: keyword.trim(),
        frequency,
      });
      setItems((arr) => [created, ...arr]);
      setKeyword('');
    } catch (e) {
      RNAlert.alert('Create failed', (e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function toggle(a: AlertItem) {
    setBusy(a.id);
    try {
      await api.patch(`/alerts/${a.id}`, { active: !a.active });
      setItems((arr) => arr.map((x) => (x.id === a.id ? { ...x, active: !a.active } : x)));
    } finally {
      setBusy(null);
    }
  }

  function confirmRemove(a: AlertItem) {
    RNAlert.alert(
      'Delete alert?',
      `You won't receive notifications for "${a.keyword}" any more.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setBusy(a.id);
            try {
              await api.delete(`/alerts/${a.id}`);
              setItems((arr) => arr.filter((x) => x.id !== a.id));
            } finally {
              setBusy(null);
            }
          },
        },
      ],
    );
  }

  const isGrid = view === 'grid';

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={s.container}
    >
      <View style={s.appTop}>
        <View style={{ flex: 1 }}>
          <Text style={s.h2}>Alerts</Text>
          <Text style={s.topSub}>
            {items.length} ALERT{items.length === 1 ? '' : 'S'}
          </Text>
        </View>
        <ViewToggle value={view} onChange={setView} />
      </View>

      <FlatList
        key={view}
        data={items}
        keyExtractor={(i) => i.id}
        numColumns={isGrid ? 2 : 1}
        columnWrapperStyle={isGrid ? s.columnWrap : undefined}
        contentContainerStyle={[s.listPad, isGrid && { paddingHorizontal: 8 }]}
        refreshControl={
          <RefreshControl refreshing={refreshing} tintColor={colors.fg} onRefresh={refresh} />
        }
        onEndReachedThreshold={0.5}
        onEndReached={loadMore}
        ListHeaderComponent={
          <View style={s.createCard}>
            <Text style={s.label}>Keyword</Text>
            <TextInput
              style={s.input}
              value={keyword}
              onChangeText={setKeyword}
              placeholder='e.g. "Series B" funding'
              placeholderTextColor={colors.fgSubtle}
              onSubmitEditing={create}
            />
            <Text style={[s.label, { marginTop: 8 }]}>Frequency</Text>
            <View style={s.freqRow}>
              {(['REALTIME', 'HOURLY', 'DAILY'] as Frequency[]).map((f) => (
                <Pressable
                  key={f}
                  style={[s.freqBtn, frequency === f && s.freqBtnActive]}
                  onPress={() => setFrequency(f)}
                >
                  <Text style={[s.freqText, frequency === f && s.freqTextActive]}>
                    {f.toLowerCase()}
                  </Text>
                </Pressable>
              ))}
            </View>
            <Pressable
              style={[s.primaryBtn, (busy === 'create' || !keyword.trim()) && { opacity: 0.5 }]}
              onPress={create}
              disabled={busy === 'create' || !keyword.trim()}
            >
              {busy === 'create' ? (
                <ActivityIndicator color={colors.accentFg} />
              ) : (
                <>
                  <Ionicons name="add" size={14} color={colors.accentFg} />
                  <Text style={s.primaryBtnText}>Create alert</Text>
                </>
              )}
            </Pressable>
          </View>
        }
        renderItem={({ item }) =>
          isGrid ? (
            <GridAlertCard item={item} busy={busy === item.id} onToggle={() => toggle(item)} onRemove={() => confirmRemove(item)} />
          ) : (
            <ListAlertCard item={item} busy={busy === item.id} onToggle={() => toggle(item)} onRemove={() => confirmRemove(item)} />
          )
        }
        ListEmptyComponent={
          !refreshing ? (
            <View style={s.empty}>
              <View style={s.emptyIcon}>
                <Ionicons name="notifications-outline" size={20} color={colors.fgMuted} />
              </View>
              <Text style={s.emptyTitle}>No alerts yet</Text>
              <Text style={s.emptyText}>Create one above to get notified when matching results land.</Text>
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
    </KeyboardAvoidingView>
  );
}

function ListAlertCard({
  item,
  busy,
  onToggle,
  onRemove,
}: {
  item: AlertItem;
  busy: boolean;
  onToggle: () => void;
  onRemove: () => void;
}) {
  return (
    <View style={s.card}>
      <View style={s.cardHead}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={s.cardTitle} numberOfLines={1}>
              {item.keyword}
            </Text>
            <View
              style={[
                s.statusBadge,
                {
                  backgroundColor: item.active ? colors.accent : colors.bgSunk,
                  borderColor: item.active ? colors.accent : colors.border,
                },
              ]}
            >
              <Text
                style={[
                  s.statusBadgeText,
                  { color: item.active ? colors.accentFg : colors.fgMuted },
                ]}
              >
                {item.active ? 'Active' : 'Paused'}
              </Text>
            </View>
            <View style={s.kwChip}>
              <Text style={s.kwText}>{item.frequency.toLowerCase()}</Text>
            </View>
          </View>
          <Text style={s.metaItem}>
            {item.lastTriggered ? `last triggered ${item.lastTriggered}` : 'never triggered'}
          </Text>
        </View>
      </View>
      <View style={s.actions}>
        <Pressable style={[s.secondaryBtn, busy && { opacity: 0.5 }]} onPress={onToggle} disabled={busy}>
          <Text style={s.secondaryBtnText}>{item.active ? 'Pause' : 'Resume'}</Text>
        </Pressable>
        <Pressable style={[s.iconBtn, busy && { opacity: 0.5 }]} onPress={onRemove} disabled={busy}>
          <Ionicons name="trash-outline" size={14} color={colors.fg} />
        </Pressable>
      </View>
    </View>
  );
}

function GridAlertCard({
  item,
  busy,
  onToggle,
  onRemove,
}: {
  item: AlertItem;
  busy: boolean;
  onToggle: () => void;
  onRemove: () => void;
}) {
  return (
    <View style={s.gridCard}>
      <Text style={s.gridTitle} numberOfLines={2}>
        {item.keyword}
      </Text>
      <View style={[s.statusBadge, { alignSelf: 'flex-start' }]}>
        <Text style={[s.statusBadgeText, { color: colors.fgMuted }]}>{item.frequency.toLowerCase()}</Text>
      </View>
      <Text style={[s.metaItem, { marginTop: 'auto' }]} numberOfLines={1}>
        {item.lastTriggered ?? 'never'}
      </Text>
      <View style={s.gridActions}>
        <Pressable style={[s.secondaryBtn, busy && { opacity: 0.5 }]} onPress={onToggle} disabled={busy}>
          <Text style={s.secondaryBtnText}>{item.active ? 'Pause' : 'Resume'}</Text>
        </Pressable>
        <Pressable style={[s.iconBtn, busy && { opacity: 0.5 }]} onPress={onRemove} disabled={busy}>
          <Ionicons name="trash-outline" size={14} color={colors.fg} />
        </Pressable>
      </View>
    </View>
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
  },
  h2: { fontSize: 18, fontFamily: fonts.sansSemibold, color: colors.fg, letterSpacing: -0.2 },
  topSub: { fontFamily: fonts.mono, fontSize: 11, color: colors.fgSubtle, marginTop: 2, letterSpacing: 0.4 },
  listPad: { padding: 12, paddingBottom: 120, gap: 8 },
  columnWrap: { gap: 8, paddingHorizontal: 4 },

  createCard: {
    backgroundColor: colors.bgElev,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.card,
    padding: 16,
    marginBottom: 12,
  },
  label: { fontSize: 12, fontFamily: fonts.sansMedium, color: colors.fg, marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg,
    borderRadius: radii.lg,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.fg,
    fontFamily: fonts.sans,
  },
  freqRow: { flexDirection: 'row', gap: 6 },
  freqBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radii.control,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgElev,
  },
  freqBtnActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  freqText: { fontFamily: fonts.mono, fontSize: 11, color: colors.fgMuted },
  freqTextActive: { color: colors.accentFg },
  primaryBtn: {
    marginTop: 12,
    backgroundColor: colors.accent,
    borderRadius: radii.lg,
    paddingVertical: 11,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  primaryBtnText: { color: colors.accentFg, fontFamily: fonts.sansMedium, fontSize: 13 },

  card: {
    backgroundColor: colors.bgElev,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.card,
    padding: 14,
    gap: 10,
  },
  cardHead: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  cardTitle: { fontSize: 15, fontFamily: fonts.sansSemibold, color: colors.fg },
  metaItem: { fontFamily: fonts.mono, fontSize: 11, color: colors.fgMuted, marginTop: 4 },

  statusBadge: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgSunk,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusBadgeText: { fontFamily: fonts.monoMedium, fontSize: 10 },

  kwChip: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgSunk,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 4,
  },
  kwText: { fontFamily: fonts.mono, fontSize: 10, color: colors.fg },

  actions: { flexDirection: 'row', gap: 8, justifyContent: 'flex-end' },
  secondaryBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgElev,
  },
  secondaryBtnText: { color: colors.fg, fontFamily: fonts.sansMedium, fontSize: 12 },
  iconBtn: {
    width: 32,
    height: 32,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgElev,
    alignItems: 'center',
    justifyContent: 'center',
  },

  gridCard: {
    flex: 1,
    minHeight: 150,
    backgroundColor: colors.bgElev,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.card,
    padding: 12,
    margin: 4,
    gap: 6,
  },
  gridTitle: { fontSize: 13, fontFamily: fonts.sansSemibold, color: colors.fg, letterSpacing: -0.1 },
  gridActions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },

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
});
