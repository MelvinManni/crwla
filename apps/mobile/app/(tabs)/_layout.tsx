import { Tabs, Redirect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, View } from 'react-native';
import { useAuth } from '../../lib/auth';
import { colors, fonts } from '../../lib/theme';

export default function TabsLayout() {
  const { user, loading } = useAuth();
  if (loading)
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bg }}>
        <ActivityIndicator color={colors.fg} />
      </View>
    );
  if (!user) return <Redirect href="/(auth)/signin" />;

  const showAdmin = user.role === 'ADMIN';

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.fg,
        tabBarInactiveTintColor: colors.fgSubtle,
        tabBarStyle: {
          backgroundColor: colors.bg,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: 76,
          paddingTop: 6,
          paddingBottom: 22,
        },
        tabBarLabelStyle: {
          fontFamily: fonts.sansMedium,
          fontSize: 11,
          letterSpacing: 0.2,
        },
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Crawls',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="search" color={color} size={size - 2} />
          ),
        }}
      />
      <Tabs.Screen
        name="alerts"
        options={{
          title: 'Alerts',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="notifications-outline" color={color} size={size - 2} />
          ),
        }}
      />
      <Tabs.Screen
        name="billing"
        options={{
          title: 'Billing',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="card-outline" color={color} size={size - 2} />
          ),
        }}
      />
      <Tabs.Screen
        name="admin"
        options={{
          title: 'Admin',
          href: showAdmin ? '/(tabs)/admin' : null,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="people-outline" color={color} size={size - 2} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-outline" color={color} size={size - 2} />
          ),
        }}
      />
      <Tabs.Screen
        name="search/[id]"
        options={{
          href: null,
          headerShown: true,
        }}
      />
    </Tabs>
  );
}
