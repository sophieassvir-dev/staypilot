import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'

const s = StyleSheet.create({
  page: { fontFamily: 'Helvetica', padding: 50, fontSize: 10, color: '#1A0A2E' },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 36 },
  title: { fontSize: 28, fontFamily: 'Helvetica-Bold', color: '#4B1DA8', letterSpacing: 2 },
  badge: { fontSize: 9, color: '#9B06D4', backgroundColor: '#F3E8FF', padding: '4 10', borderRadius: 4, alignSelf: 'flex-start', marginTop: 6 },
  meta: { fontSize: 9, color: '#64748b', textAlign: 'right' },
  metaVal: { fontSize: 10, color: '#1A0A2E', fontFamily: 'Helvetica-Bold' },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#9B06D4', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 6, paddingBottom: 4, borderBottom: '1 solid #E8D5FF' },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 24 },
  block: { flex: 1 },
  label: { fontSize: 9, color: '#64748b', marginBottom: 2 },
  value: { fontSize: 10, color: '#1A0A2E' },
  bold: { fontFamily: 'Helvetica-Bold' },
  tableHeader: { flexDirection: 'row', backgroundColor: '#4B1DA8', padding: '8 12', borderRadius: 4, marginBottom: 1 },
  tableHeaderCell: { color: 'white', fontSize: 9, fontFamily: 'Helvetica-Bold' },
  tableRow: { flexDirection: 'row', padding: '10 12', backgroundColor: '#FDF0FF', marginBottom: 1, borderRadius: 2 },
  tableCell: { fontSize: 10, color: '#1A0A2E' },
  col1: { flex: 4 },
  col2: { flex: 1, textAlign: 'center' },
  col3: { flex: 1, textAlign: 'right' },
  col4: { flex: 1, textAlign: 'right' },
  totalRow: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 8 },
  totalBox: { backgroundColor: '#4B1DA8', padding: '10 16', borderRadius: 6, flexDirection: 'row', alignItems: 'center', gap: 16 },
  totalLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 10 },
  totalAmount: { color: 'white', fontSize: 16, fontFamily: 'Helvetica-Bold' },
  noticeBox: { marginTop: 16, padding: '8 12', backgroundColor: '#F8F8FF', borderLeft: '3 solid #9B06D4', borderRadius: 2 },
  noticeText: { fontSize: 8.5, color: '#64748b', fontStyle: 'italic' },
  conditionsBox: { marginTop: 10, padding: '8 12', backgroundColor: '#FFF9E6', borderLeft: '3 solid #F5C842', borderRadius: 2 },
  conditionsText: { fontSize: 8.5, color: '#92400e' },
  footer: { position: 'absolute', bottom: 30, left: 50, right: 50, textAlign: 'center', color: '#94a3b8', fontSize: 8, borderTop: '1 solid #E8D5FF', paddingTop: 12 },
  stamp: { position: 'absolute', top: 200, right: 60, transform: 'rotate(-25deg)', border: '3 solid #16a34a', borderRadius: 6, padding: '6 14' },
  stampText: { fontSize: 22, fontFamily: 'Helvetica-Bold', color: '#16a34a', letterSpacing: 3 },
})

interface InvoiceDocProps {
  invoiceNumber: string
  issuedAt: string
  legalName: string
  siret: string
  legalAddress: string
  legalCity: string
  guestName: string
  guestEmail: string | null
  propertyName: string
  propertyAddress: string | null
  propertyCity: string | null
  acquittee: boolean
  checkinDate: string
  checkoutDate: string
  nights: number
  pricePerNight: number
  total: number
}

function fmt(date: string) {
  const d = new Date(date)
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function eur(n: number) {
  return n.toFixed(2).replace('.', ',') + ' €'
}

export default function InvoiceDocument(props: InvoiceDocProps) {
  const {
    invoiceNumber, issuedAt, legalName, siret, legalAddress, legalCity,
    guestName, guestEmail, propertyName, propertyAddress, propertyCity,
    acquittee, checkinDate, checkoutDate, nights, pricePerNight, total,
  } = props

  return (
    <Document>
      <Page size="A4" style={s.page}>
        {/* En-tête */}
        <View style={s.header}>
          <View>
            <Text style={s.title}>FACTURE</Text>
            <Text style={s.badge}>N° {invoiceNumber}</Text>
          </View>
          <View>
            <Text style={s.meta}>Date d'émission</Text>
            <Text style={[s.meta, s.metaVal]}>{fmt(issuedAt)}</Text>
          </View>
        </View>

        {/* Vendeur / Acheteur */}
        <View style={[s.section, s.row]}>
          <View style={s.block}>
            <Text style={s.sectionTitle}>Émetteur</Text>
            <Text style={[s.value, s.bold]}>{legalName} EI</Text>
            <Text style={s.value}>{legalAddress}</Text>
            <Text style={s.value}>{legalCity}</Text>
            <Text style={[s.label, { marginTop: 8 }]}>SIRET</Text>
            <Text style={[s.value, s.bold]}>{siret}</Text>
          </View>
          <View style={s.block}>
            <Text style={s.sectionTitle}>Facturé à</Text>
            <Text style={[s.value, s.bold]}>{guestName}</Text>
            {guestEmail && <Text style={s.value}>{guestEmail}</Text>}
          </View>
        </View>

        {/* Tableau */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Détail de la prestation</Text>
          <View style={s.tableHeader}>
            <Text style={[s.tableHeaderCell, s.col1]}>Désignation</Text>
            <Text style={[s.tableHeaderCell, s.col2]}>Nuits</Text>
            <Text style={[s.tableHeaderCell, s.col3]}>Prix / nuit</Text>
            <Text style={[s.tableHeaderCell, s.col4]}>Total</Text>
          </View>
          <View style={s.tableRow}>
            <Text style={[s.tableCell, s.col1]}>
              {'Location — ' + propertyName + '\n'}
              {(propertyAddress || propertyCity) && (
                <Text style={s.label}>{[propertyAddress, propertyCity].filter(Boolean).join(', ') + '\n'}</Text>
              )}
              <Text style={s.label}>{'Du ' + fmt(checkinDate) + ' au ' + fmt(checkoutDate)}</Text>
            </Text>
            <Text style={[s.tableCell, s.col2, { textAlign: 'center' }]}>{nights}</Text>
            <Text style={[s.tableCell, s.col3, { textAlign: 'right' }]}>{eur(pricePerNight)}</Text>
            <Text style={[s.tableCell, s.col4, s.bold, { textAlign: 'right' }]}>{eur(total)}</Text>
          </View>
          <View style={s.totalRow}>
            <View style={s.totalBox}>
              <Text style={s.totalLabel}>Total TTC</Text>
              <Text style={s.totalAmount}>{eur(total)}</Text>
            </View>
          </View>
        </View>

        {/* Mention TVA */}
        <View style={s.noticeBox}>
          <Text style={s.noticeText}>
            TVA non applicable — article 293 B du CGI.
          </Text>
        </View>

        {/* Conditions de paiement et pénalités */}
        <View style={s.conditionsBox}>
          <Text style={[s.conditionsText, s.bold]}>Conditions de paiement</Text>
          <Text style={s.conditionsText}>
            {'Paiement dû à réception de la facture. En cas de retard, des pénalités de retard au taux annuel de 12,15 % seront appliquées, ainsi qu’une indemnité forfaitaire pour frais de recouvrement de 40 € (art. L.441-10 du Code de commerce).'}
          </Text>
        </View>

        {/* Tampon ACQUITTÉE */}
        {acquittee && (
          <View style={s.stamp}>
            <Text style={s.stampText}>ACQUITTÉE</Text>
          </View>
        )}

        {/* Pied de page */}
        <Text style={s.footer}>
          {legalName + ' EI — SIRET ' + siret + ' — ' + legalAddress + ', ' + legalCity}
        </Text>
      </Page>
    </Document>
  )
}
