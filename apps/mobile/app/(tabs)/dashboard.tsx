import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { Link } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/auth';

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

export default function Dashboard() {
  const { user, signout } = useAuth();
  const [items, setItems] = useState<SearchView[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const out = await api.get<{ jobs: SearchView[] }>('/searches');
      setItems(out.jobs);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <View style={[s.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <View style={s.container}>
      <View style={s.topbar}>
        <View>
          <Text style={s.title}>Searches</Text>
          <Text style={s.sub}>
            {items.length} {items.length === 1 ? 'search' : 'searches'} · {user?.email}
          </Text>
        </View>
        <Pressable onPress={signout}>
          <Ionicons name="log-out-outline" size={22} color="#111" />
        </Pressable>
      </View>
      <FlatList
        data={items}
        keyExtractor={(i) => i.id}
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              load();
            }}
          />
        }
        renderItem={({ item }) => (
          <Link href={{ pathname: '/(tabs)/search/[id]', params: { id: item.id } }} asChild>
            <Pressable style={s.card}>
              <View style={{ flex: 1 }}>
                <Text style={s.cardTitle}>{item.name}</Text>
                <Text style={s.cardSub}>
                  {item.cronLabel} · last run {item.lastRun} · next {item.nextRun}
                </Text>
                <View style={s.chipRow}>
                  {item.keywords.slice(0, 4).map((k) => (
                    <View key={k} style={s.chip}>
                      <Text style={s.chipText}>{k}</Text>
                    </View>
                  ))}
                </View>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={s.count}>{item.results}</Text>
                <Text style={s.cardSub}>results</Text>
              </View>
            </Pressable>
          </Link>
        )}
        ListEmptyComponent={
          <View style={s.empty}>
            <Text style={{ fontWeight: '500' }}>No searches yet</Text>
            <Text style={{ color: '#777', marginTop: 4 }}>
              Open the web app to create your first one.
            </Text>
          </View>
        }
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  topbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderColor: '#eee',
  },
  title: { fontSize: 22, fontWeight: '600', color: '#111' },
  sub: { color: '#777', fontSize: 13 },
  card: {
    flexDirection: 'row',
    gap: 12,
    margin: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 12,
  },
  cardTitle: { fontWeight: '500', color: '#111', fontSize: 15 },
  cardSub: { color: '#777', fontSize: 12, marginTop: 2 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 8, gap: 4 },
  chip: { backgroundColor: '#f3f3f3', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
  chipText: { fontSize: 11, color: '#333' },
  count: { fontSize: 18, fontWeight: '600', color: '#111' },
  empty: { padding: 40, alignItems: 'center' },
});
