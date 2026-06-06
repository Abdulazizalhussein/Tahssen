import React, { useEffect, useRef } from 'react'
import { View, Text, StyleSheet, Animated, Easing } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { theme } from '../../theme'
import { useAccount } from '../../context/AccountContext'

export default function SplashScreen({ navigation }) {
  const { isLoading, isAuthed } = useAccount()
  const fade = useRef(new Animated.Value(0)).current
  const pulse = useRef(new Animated.Value(1)).current

  useEffect(() => {
    Animated.timing(fade, {
      toValue: 1,
      duration: 700,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start()

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.12, duration: 900, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 900, useNativeDriver: true }),
      ])
    )
    loop.start()
    return () => loop.stop()
  }, [fade, pulse])

  useEffect(() => {
    if (isLoading) return
    const timer = setTimeout(() => {
      navigation.reset({
        index: 0,
        routes: [{ name: isAuthed ? 'Main' : 'Auth' }],
      })
    }, 1500)
    return () => clearTimeout(timer)
  }, [isLoading, isAuthed, navigation])

  return (
    <View style={styles.screen}>
      <Animated.View style={{ opacity: fade, alignItems: 'center', transform: [{ scale: pulse }] }}>
        <View style={styles.logo}>
          <MaterialCommunityIcons name="shield-check" size={72} color={theme.gold} />
        </View>
        <Text style={styles.title}>تحصين</Text>
        <Text style={styles.tagline}>جهاز المناعة المالي</Text>
      </Animated.View>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.bg, alignItems: 'center', justifyContent: 'center' },
  logo: {
    width: 132,
    height: 132,
    borderRadius: 66,
    backgroundColor: theme.bgCardLight,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: `${theme.gold}55`,
    marginBottom: 24,
  },
  title: { color: theme.text, fontSize: 44, fontWeight: '800', letterSpacing: 1 },
  tagline: { color: theme.gold, fontSize: 16, marginTop: 8, fontWeight: '600' },
})
