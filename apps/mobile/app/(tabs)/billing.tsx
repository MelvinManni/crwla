import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import { api } from '../../lib/api';
import { colors, fonts, radii } from '../../lib/theme';

type PlanView = {
  id: string;
  tier: 'FREE' | 'STARTER' | 'BASIC' | 'PRO' | 'BUSINESS';
  name: string;
  description: string | null;
  priceMonthlyCents: number;
  priceYearlyCents: number;
  features: string[];
  hasPolar: boolean;
};

type Entitlements = {
  plan: { id: string; tier: string; name: string };
  status: string;
  interval: 'MONTH' | 'YEAR';
  currentPeriodEnd: number | null;
  cancelAtPeriodEnd: boolean;
  limits: {
    manualRunsPerMonth: number;
    savedSearches: number;
    keywordsPerSearch: number;
    smsAlertsPerMonth: number;
  };
  bonus: { extraManualRuns: number; extraSms: number; extraSeats: number };
  usage: {
    manualRuns: number;
    scheduledRuns: number;
    emailAlerts: number;
    smsAlerts: number;
  };
};

const fmtMoney = (cents: number) =>
  cents === 0 ? 'Free' : `$${(cents / 100).toFixed(cents % 100 === 0 ? 0 : 2)}`;

export default function Billing() {
  const [plans, setPlans] = useState<PlanView[] | null>(null);
  const [mine, setMine] = useState<Entitlements | null>(null);
  const [interval, setInterval] = useState<'MONTH' | 'YEAR'>('MONTH');
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [p, m] = await Promise.all([
        api.get<{ plans: PlanView[] }>('/billing/plans'),
        api.get<Entitlements>('/billing/me'),
      ]);
      setPlans(p.plans);
      setMine(m);
      setInterval(m.interval);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function checkout(tier: PlanView['tier']) {
    setBusy(tier);
    try {
      const out = await api.post<{ url: string | null; downgraded?: boolean }>(
        '/billing/checkout',
        { tier, interval },
      );
      if (out.url) {
        await WebBrowser.openBrowserAsync(out.url);
        await load();
      } else if (out.downgraded) {
        Alert.alert('Downgraded to Free');
        await load();
      }
    } catch (e) {
      Alert.alert('Checkout failed', (e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function openPortal() {
    setBusy('portal');
    try {
      const out = await api.post<{ url: string | null }>('/billing/portal');
      if (out.url) await WebBrowser.openBrowserAsync(out.url);
      else Alert.alert('No customer portal yet — buy a plan first');
    } catch (e) {
      Alert.alert('Portal failed', (e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  if (!plans || !mine) {
    return (
      <View style={[s.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator color={colors.fg} />
      </View>
    );
  }

  return (
    <ScrollView
      style={s.container}
      contentContainerStyle={{ paddingBottom: 120 }}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          tintColor={colors.fg}
          onRefresh={() => {
            setRefreshing(true);
            load();
          }}
        />
      }
    >
      <View style={s.appTop}>
        <Text style={s.h2}>Billing</Text>
        <Text style={s.topSub}>
          {mine.plan.name.toUpperCase()} · {mine.status} · {mine.interval.toLowerCase()}LY
          {mine.cancelAtPeriodEnd ? ' · CANCELING' : ''}
        </Text>
      </View>

      <View style={s.usageCard}>
        <Stat label="Manual runs" value={mine.usage.manualRuns} bonus={mine.bonus.extraManualRuns} />
        <Stat label="Email alerts" value={mine.usage.emailAlerts} />
        <Stat label="SMS alerts" value={mine.usage.smsAlerts} bonus={mine.bonus.extraSms} />
      </View>

      <Pressable style={[s.secondaryBtn, { margin: 12 }]} onPress={openPortal} disabled={busy !== null}>
        <Ionicons name="open-outline" size={14} color={colors.fg} />
        <Text style={s.secondaryBtnText}>Manage on Polar</Text>
      </Pressable>

      <View style={s.toggleRow}>
        <Pressable
          style={[s.toggleBtn, interval === 'MONTH' && s.toggleBtnActive]}
          onPress={() => setInterval('MONTH')}
        >
          <Text style={[s.toggleText, interval === 'MONTH' && s.toggleTextActive]}>Monthly</Text>
        </Pressable>
        <Pressable
          style={[s.toggleBtn, interval === 'YEAR' && s.toggleBtnActive]}
          onPress={() => setInterval('YEAR')}
        >
          <Text style={[s.toggleText, interval === 'YEAR' && s.toggleTextActive]}>Yearly</Text>
        </Pressable>
      </View>

      <View style={{ paddingHorizontal: 12, gap: 10 }}>
        {plans.map((p) => {
          const cents = interval === 'YEAR' ? p.priceYearlyCents : p.priceMonthlyCents;
          const current = p.tier === mine.plan.tier;
          return (
            <View
              key={p.id}
              style={[s.planCard, current && { borderColor: colors.fg, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4 }]}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                <View style={{ flex: 1 }}>
                  <Text style={s.planName}>{p.name}</Text>
                  {p.description && <Text style={s.planDesc}>{p.description}</Text>}
                </View>
                {current && (
                  <View style={s.currentTag}>
                    <Text style={s.currentTagText}>CURRENT</Text>
                  </View>
                )}
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4, marginTop: 8 }}>
                <Text style={s.price}>{fmtMoney(cents)}</Text>
                {cents > 0 && (
                  <Text style={s.priceUnit}>/{interval === 'YEAR' ? 'year' : 'mo'}</Text>
                )}
              </View>
              <View style={{ marginTop: 10, gap: 4 }}>
                {p.features.slice(0, 6).map((f) => (
                  <View key={f} style={{ flexDirection: 'row', gap: 8 }}>
                    <Ionicons name="checkmark" size={12} color={colors.fgMuted} />
                    <Text style={s.feature}>{f}</Text>
                  </View>
                ))}
                {p.features.length > 6 && (
                  <Text style={[s.feature, { color: colors.fgSubtle, marginLeft: 20 }]}>
                    +{p.features.length - 6} more
                  </Text>
                )}
              </View>
              {!current && (
                <Pressable
                  style={[
                    s.primaryBtn,
                    busy === p.tier && { opacity: 0.5 },
                    !p.hasPolar && p.tier !== 'FREE' && { opacity: 0.4 },
                  ]}
                  onPress={() => checkout(p.tier)}
                  disabled={busy !== null || (!p.hasPolar && p.tier !== 'FREE')}
                >
                  {busy === p.tier ? (
                    <ActivityIndicator color={colors.accentFg} />
                  ) : (
                    <Text style={s.primaryBtnText}>
                      {p.tier === 'FREE'
                        ? 'Downgrade to Free'
                        : !p.hasPolar
                          ? 'Coming soon'
                          : `Upgrade to ${p.name}`}
                    </Text>
                  )}
                </Pressable>
              )}
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}

function Stat({ label, value, bonus }: { label: string; value: number; bonus?: number }) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={s.statLabel}>{label}</Text>
      <Text style={s.statValue}>{value}</Text>
      {bonus !== undefined && bonus > 0 && (
        <Text style={[s.statLabel, { color: colors.fgMuted }]}>+{bonus} bonus</Text>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  appTop: {
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
  h2: { fontSize: 22, fontFamily: fonts.sansSemibold, color: colors.fg, letterSpacing: -0.3 },
  topSub: {
    fontFamily: fonts.mono,
    fontSize: 11,
    color: colors.fgSubtle,
    marginTop: 2,
    letterSpacing: 0.4,
  },
  usageCard: {
    margin: 12,
    padding: 14,
    backgroundColor: colors.bgElev,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.card,
    flexDirection: 'row',
    gap: 12,
  },
  statLabel: {
    fontFamily: fonts.mono,
    fontSize: 10,
    color: colors.fgSubtle,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  statValue: { fontSize: 18, fontFamily: fonts.sansSemibold, color: colors.fg, marginTop: 4 },
  toggleRow: {
    flexDirection: 'row',
    alignSelf: 'center',
    backgroundColor: colors.bgElev,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    padding: 2,
    marginVertical: 12,
  },
  toggleBtn: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: radii.control },
  toggleBtnActive: { backgroundColor: colors.bgSunk },
  toggleText: { fontFamily: fonts.mono, fontSize: 11, color: colors.fgMuted },
  toggleTextActive: { color: colors.fg },
  planCard: {
    backgroundColor: colors.bgElev,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.card,
    padding: 16,
  },
  planName: { fontSize: 15, fontFamily: fonts.sansSemibold, color: colors.fg },
  planDesc: { color: colors.fgMuted, fontSize: 12, fontFamily: fonts.sans, marginTop: 4 },
  currentTag: {
    borderWidth: 1,
    borderColor: colors.fg,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  currentTagText: { fontFamily: fonts.monoMedium, fontSize: 10, color: colors.fg, letterSpacing: 0.4 },
  price: { fontSize: 26, fontFamily: fonts.sansSemibold, color: colors.fg, letterSpacing: -0.4 },
  priceUnit: { fontFamily: fonts.mono, fontSize: 11, color: colors.fgMuted },
  feature: { fontFamily: fonts.sans, fontSize: 12, color: colors.fg, flex: 1 },
  primaryBtn: {
    marginTop: 14,
    backgroundColor: colors.accent,
    borderRadius: radii.lg,
    paddingVertical: 11,
    alignItems: 'center',
  },
  primaryBtnText: { color: colors.accentFg, fontFamily: fonts.sansMedium, fontSize: 13 },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgElev,
    borderRadius: radii.lg,
    paddingVertical: 9,
  },
  secondaryBtnText: { color: colors.fg, fontFamily: fonts.sansMedium, fontSize: 13 },
});
