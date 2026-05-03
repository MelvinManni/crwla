import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { api } from '../../lib/api';

type Req = { id: string; name: string; email: string; team: string; reason: string; requested: string };

export default function Admin() {
  const [items, setItems] = useState<Req[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  async function load() {
    try {
      const out = await api.get<{ requests: Req[] }>('/admin/requests');
      setItems(out.requests);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
  }, []);

  async function approve(id: string) {
    setBusy(id);
    try {
      await api.post(`/admin/requests/${id}/approve`);
      setItems((arr) => arr.filter((x) => x.id !== id));
    } finally {
      setBusy(null);
    }
  }
  async function deny(id: string) {
    setBusy(id);
    try {
      await api.post(`/admin/requests/${id}/deny`);
      setItems((arr) => arr.filter((x) => x.id !== id));
    } finally {
      setBusy(null);
    }
  }

  if (loading) {
    return (
      <View style={[s.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <View style={s.container}>
      <Text style={s.title}>Pending requests</Text>
      <FlatList
        data={items}
        keyExtractor={(i) => i.id}
        contentContainerStyle={{ padding: 12 }}
        renderItem={({ item }) => (
          <View style={s.card}>
            <Text style={s.name}>{item.name}</Text>
            <Text style={s.sub}>
              {item.email} · {item.team} · {item.requested}
            </Text>
            {item.reason ? <Text style={s.reason}>{item.reason}</Text> : null}
            <View style={s.buttons}>
              <Pressable style={[s.btn, s.btnPrimary]} disabled={busy === item.id} onPress={() => approve(item.id)}>
                <Text style={s.btnPrimaryText}>Approve</Text>
              </Pressable>
              <Pressable style={[s.btn, s.btnGhost]} disabled={busy === item.id} onPress={() => deny(item.id)}>
                <Text style={s.btnGhostText}>Deny</Text>
              </Pressable>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <View style={{ padding: 40, alignItems: 'center' }}>
            <Text style={{ color: '#777' }}>No pending requests.</Text>
          </View>
        }
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  title: { fontSize: 20, fontWeight: '600', color: '#111', padding: 16, paddingTop: 56 },
  card: { padding: 14, borderWidth: 1, borderColor: '#eee', borderRadius: 12, marginBottom: 8 },
  name: { fontWeight: '500', color: '#111', fontSize: 15 },
  sub: { color: '#777', fontSize: 12, marginTop: 2 },
  reason: { marginTop: 6, fontSize: 13, color: '#333' },
  buttons: { flexDirection: 'row', gap: 8, marginTop: 12 },
  btn: { flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
  btnPrimary: { backgroundColor: '#111' },
  btnPrimaryText: { color: '#fff', fontSize: 13, fontWeight: '500' },
  btnGhost: { borderWidth: 1, borderColor: '#e5e5e5' },
  btnGhostText: { color: '#111', fontSize: 13 },
});
