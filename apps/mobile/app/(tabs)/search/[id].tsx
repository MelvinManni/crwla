import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Linking,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../../lib/api';

type Result = {
  id: string;
  source: string;
  title: string;
  url: string;
  snippet: string | null;
  time: string | null;
};

type Out = {
  job: { id: string; name: string; keywords: string[]; lastRun: string };
  results: Result[];
};

export default function SearchResults() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [data, setData] = useState<Out | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [running, setRunning] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const out = await api.get<Out>(`/searches/${id}/results`);
      setData(out);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function runNow() {
    if (!id) return;
    setRunning(true);
    try {
      await api.post(`/searches/${id}/run`);
      setTimeout(load, 1500);
    } finally {
      setRunning(false);
    }
  }

  if (loading || !data) {
    return (
      <View style={[s.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <View style={s.container}>
      <Stack.Screen options={{ title: data.job.name }} />
      <FlatList
        data={data.results}
        keyExtractor={(i) => i.id}
        contentContainerStyle={{ padding: 12 }}
        ListHeaderComponent={
          <View style={{ marginBottom: 12 }}>
            <Text style={s.title}>{data.job.name}</Text>
            <Text style={s.sub}>
              {data.job.keywords.length} keywords · last run {data.job.lastRun}
            </Text>
            <Pressable style={s.runBtn} onPress={runNow} disabled={running}>
              {running ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="play" color="#fff" size={14} />
                  <Text style={s.runBtnText}>Run now</Text>
                </>
              )}
            </Pressable>
          </View>
        }
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
          <Pressable style={s.card} onPress={() => Linking.openURL(item.url)}>
            <Text style={s.cardSource}>
              {item.source}
              {item.time ? ` · ${item.time}` : ''}
            </Text>
            <Text style={s.cardTitle}>{item.title}</Text>
            {item.snippet && (
              <Text style={s.cardSnippet} numberOfLines={2}>
                {item.snippet}
              </Text>
            )}
          </Pressable>
        )}
        ListEmptyComponent={
          <View style={{ padding: 40, alignItems: 'center' }}>
            <Text style={{ color: '#777' }}>No results yet — try Run now.</Text>
          </View>
        }
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  title: { fontSize: 20, fontWeight: '600', color: '#111' },
  sub: { color: '#777', fontSize: 13, marginTop: 2 },
  runBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: '#111',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 12,
  },
  runBtnText: { color: '#fff', fontSize: 13, fontWeight: '500' },
  card: {
    padding: 14,
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 12,
    marginBottom: 8,
  },
  cardSource: { color: '#777', fontSize: 11 },
  cardTitle: { fontWeight: '500', color: '#111', fontSize: 14, marginTop: 4 },
  cardSnippet: { color: '#666', fontSize: 13, marginTop: 4 },
});
