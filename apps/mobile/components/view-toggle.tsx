import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts, radii } from '../lib/theme';

export type ViewMode = 'list' | 'grid';

export function ViewToggle({
  value,
  onChange,
}: {
  value: ViewMode;
  onChange: (next: ViewMode) => void;
}) {
  return (
    <View style={s.wrap}>
      <Pressable
        style={[s.btn, value === 'list' && s.btnActive]}
        onPress={() => onChange('list')}
        hitSlop={6}
      >
        <Ionicons name="list" size={13} color={value === 'list' ? colors.fg : colors.fgMuted} />
        <Text style={[s.text, value === 'list' && s.textActive]}>List</Text>
      </Pressable>
      <Pressable
        style={[s.btn, value === 'grid' && s.btnActive]}
        onPress={() => onChange('grid')}
        hitSlop={6}
      >
        <Ionicons name="grid" size={12} color={value === 'grid' ? colors.fg : colors.fgMuted} />
        <Text style={[s.text, value === 'grid' && s.textActive]}>Grid</Text>
      </Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgElev,
    borderRadius: radii.lg,
    padding: 2,
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radii.control,
  },
  btnActive: { backgroundColor: colors.bgSunk },
  text: { fontFamily: fonts.mono, fontSize: 11, color: colors.fgMuted },
  textActive: { color: colors.fg },
});
