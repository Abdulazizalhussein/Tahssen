import React, { useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Modal,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native'
import { Feather } from '@expo/vector-icons'
import { theme } from '../theme'
import { useAccount } from '../context/AccountContext'

const BANKS = ['الإنماء', 'الراجحي', 'الأهلي', 'الرياض', 'سامبا', 'البلاد', 'الجزيرة', 'الفرنسي', 'ساب', 'ستاندرد']

export default function AddBeneficiaryModal({ visible, onClose, onSaved }) {
  const { t, isRTL, addBeneficiary } = useAccount()
  const [name, setName] = useState('')
  const [iban, setIban] = useState('')
  const [bank, setBank] = useState('')
  const [busy, setBusy] = useState(false)

  const reset = () => {
    setName('')
    setIban('')
    setBank('')
    setBusy(false)
  }

  const close = () => {
    reset()
    onClose()
  }

  const save = async () => {
    if (!name.trim() || busy) return
    setBusy(true)
    try {
      await addBeneficiary({ name: name.trim(), iban: iban.trim(), bank: bank.trim() })
      reset()
      onSaved?.(name.trim())
      onClose()
    } catch (e) {
      setBusy(false)
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={close}>
      <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.sheet}>
          <View style={[styles.sheetHead, isRTL && styles.rtl]}>
            <Text style={styles.sheetTitle}>{t('newBeneficiary')}</Text>
            <TouchableOpacity onPress={close}>
              <Feather name="x" size={22} color={theme.textMuted} />
            </TouchableOpacity>
          </View>

          <Text style={[styles.fieldLabel, { textAlign: isRTL ? 'right' : 'left' }]}>{t('benName')}</Text>
          <View style={[styles.inputWrap, isRTL && styles.rtl]}>
            <Feather name="user" size={18} color={theme.textMuted} />
            <TextInput
              style={[styles.input, { textAlign: isRTL ? 'right' : 'left' }]}
              placeholder={t('benName')}
              placeholderTextColor={theme.textHint}
              value={name}
              onChangeText={setName}
            />
          </View>

          <Text style={[styles.fieldLabel, { textAlign: isRTL ? 'right' : 'left', marginTop: 14 }]}>{t('benIban')}</Text>
          <View style={[styles.inputWrap, isRTL && styles.rtl]}>
            <Feather name="credit-card" size={18} color={theme.textMuted} />
            <TextInput
              style={[styles.input, { textAlign: isRTL ? 'right' : 'left' }]}
              placeholder="SA00 0000 0000 0000 0000 0000"
              placeholderTextColor={theme.textHint}
              value={iban}
              onChangeText={setIban}
              autoCapitalize="characters"
            />
          </View>

          <Text style={[styles.fieldLabel, { textAlign: isRTL ? 'right' : 'left', marginTop: 14 }]}>{t('benBank')}</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.bankWrap}
            keyboardShouldPersistTaps="handled"
          >
            {BANKS.map((b) => {
              const active = bank === b
              return (
                <TouchableOpacity
                  key={b}
                  style={[styles.bankChip, active && styles.bankChipActive]}
                  onPress={() => setBank(active ? '' : b)}
                >
                  <Text style={[styles.bankChipText, active && styles.bankChipTextActive]}>{b}</Text>
                </TouchableOpacity>
              )
            })}
          </ScrollView>

          <TouchableOpacity
            style={[styles.primaryBtn, (!name.trim() || busy) && { opacity: 0.4 }]}
            onPress={save}
            disabled={!name.trim() || busy}
            activeOpacity={0.85}
          >
            <Text style={styles.primaryBtnText}>{t('save')}</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  )
}

const styles = StyleSheet.create({
  rtl: { flexDirection: 'row-reverse' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: theme.bgCard,
    borderTopLeftRadius: theme.radiusXl,
    borderTopRightRadius: theme.radiusXl,
    padding: 22,
    paddingBottom: 36,
    maxHeight: '85%',
    borderTopWidth: 0.5,
    borderColor: theme.borderLight,
  },
  sheetHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  sheetTitle: { color: theme.text, fontSize: 18, fontWeight: '800' },
  fieldLabel: { color: theme.textMuted, fontSize: 13, marginBottom: 8 },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: theme.borderLight,
  },
  input: { flex: 1, color: theme.text, fontSize: 16, paddingVertical: 13 },
  bankWrap: { gap: 8, paddingVertical: 2 },
  bankChip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: theme.borderLight,
  },
  bankChipActive: { backgroundColor: theme.teal, borderColor: theme.teal },
  bankChipText: { color: theme.textMuted, fontSize: 13, fontWeight: '600' },
  bankChipTextActive: { color: theme.text },
  primaryBtn: {
    backgroundColor: theme.teal,
    height: 52,
    borderRadius: theme.radius,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 22,
  },
  primaryBtnText: { color: theme.text, fontSize: 16, fontWeight: '600' },
})
