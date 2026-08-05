import React, { useState, useEffect } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  SafeAreaView,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { api, getToken, clearToken, getConfig, setToken, defaultConfig, setConfig } from './src/api';
import type { Cliente, Servico, NFSENota, NFSECreate, ServicoItem, Cobranca, Empresa } from './src/types';

type Screen = 'login' | 'dashboard' | 'clients' | 'services' | 'new-nfse' | 'consult' | 'charges' | 'settings';

const money = (v: number) => `R$ ${Number(v || 0).toFixed(2).replace('.', ',')}`;
const dateBR = (s?: string) => (s ? new Date(s).toLocaleDateString('pt-BR') : '');

export default function App() {
  const [screen, setScreen] = useState<Screen>('login');
  const [loading, setLoading] = useState(false);

  const [clients, setClients] = useState<Cliente[]>([]);
  const [services, setServices] = useState<Servico[]>([]);
  const [notes, setNotes] = useState<NFSENota[]>([]);
  const [charges, setCharges] = useState<Cobranca[]>([]);

  const [selectedClient, setSelectedClient] = useState<Cliente | null>(null);
  const [selectedServices, setSelectedServices] = useState<ServicoItem[]>([]);
  const [issRetido, setIssRetido] = useState('N');
  const [observacoes, setObservacoes] = useState('');
  const [desconto, setDesconto] = useState('0');
  const [competencia, setCompetencia] = useState(new Date().toISOString().split('T')[0]);

  const [showClientModal, setShowClientModal] = useState(false);
  const [showServiceModal, setShowServiceModal] = useState(false);

  const [email, setEmail] = useState('admin@integracode.com.br');
  const [password, setPassword] = useState('admin123');

  const [empresa, setEmpresa] = useState<Empresa>(defaultConfig.empresa);
  const [apiUrl, setApiUrl] = useState('');

  useEffect(() => { (async () => {
    const t = await getToken();
    if (t) { setScreen('dashboard'); loadData(); }
  })(); }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [c, s, n, ch] = await Promise.all([
        api<Cliente[]>('/clients'),
        api<Servico[]>('/services'),
        api<NFSENota[]>('/nfse/listar'),
        api<Cobranca[]>('/charges'),
      ]);
      setClients(c); setServices(s); setNotes(n); setCharges(ch);
    } catch { Alert.alert('Erro', 'Falha ao carregar dados'); }
    finally { setLoading(false); }
  }

  async function handleLogin() {
    setLoading(true);
    try {
      const r = await api<{ accessToken: string }>('/auth/login', { method: 'POST', body: { email, password } });
      await setToken(r.accessToken);
      setScreen('dashboard'); loadData();
    } catch (e) { Alert.alert('Erro', e instanceof Error ? e.message : 'Login falhou'); }
    finally { setLoading(false); }
  }

  function addService(s: Servico) {
    setSelectedServices(prev => {
      const ex = prev.find(x => x.servicoId === s.id);
      if (ex) return prev.map(x => x.servicoId === s.id ? { ...x, quantidade: x.quantidade + 1, valorTotal: (x.quantidade + 1) * x.valorUnitario } : x);
      return [...prev, { servicoId: s.id, descricao: s.descricao, quantidade: 1, valorUnitario: s.valorUnitario, valorTotal: s.valorUnitario }];
    });
  }
  function removeService(id: number) { setSelectedServices(prev => prev.filter(x => x.servicoId !== id)); }

  const totalBruto = selectedServices.reduce((s, x) => s + x.valorTotal, 0);
  const total = totalBruto - (parseFloat(desconto) || 0);

  async function emitNFSE(withCharge = false) {
    if (!selectedClient) { Alert.alert('Atencao', 'Selecione um cliente'); return; }
    if (selectedServices.length === 0) { Alert.alert('Atencao', 'Adicione ao menos um servico'); return; }
    setLoading(true);
    try {
      const payload: NFSECreate = {
        competencia,
        itemListaServico: selectedServices[0].descricao.split(' - ')[0] || '01.00',
        issRetido,
        discriminacao: observacoes,
        valorServicos: total > 0 ? total : totalBruto,
        desconto: parseFloat(desconto) || 0,
        deducoes: 0,
        aliquotaIss: 0.02,
        cliente: selectedClient,
        servicos: selectedServices,
        rpsSerie: '1',
        rpsTipo: '1',
      };
      const nfse = await api<NFSENota>('/nfse/emitir', { method: 'POST', body: payload });
      Alert.alert('Sucesso', `NFS-e ${nfse.numero} emitida (${nfse.status})`);
      if (withCharge) {
        try {
          const charge = await api<Cobranca>('/charges', {
            method: 'POST',
            body: {
              customer: selectedClient.asaasId || selectedClient.cpfCnpj,
              billingType: 'PIX',
              value: total,
              dueDate: new Date(Date.now() + 864e5).toISOString().split('T')[0],
              description: `NFS-e ${nfse.numero}`,
              externalReference: `nfse-${nfse.id}`,
            },
          });
          setCharges(prev => [charge, ...prev]);
          Alert.alert('Cobranca', `Criada no Asaas: ${charge.id}`);
        } catch (e) { Alert.alert('Cobranca', 'Falha ao criar no Asaas: ' + (e instanceof Error ? e.message : '')); }
      }
      resetForm();
      setScreen('dashboard'); loadData();
    } catch (e) { Alert.alert('Erro', e instanceof Error ? e.message : 'Falha ao emitir'); }
    finally { setLoading(false); }
  }

  function resetForm() {
    setSelectedClient(null); setSelectedServices([]); setIssRetido('N');
    setObservacoes(''); setDesconto('0'); setCompetencia(new Date().toISOString().split('T')[0]);
  }

  async function share(n: NFSENota) {
    const msg = [
      'Integra Code - NFS-e',
      `Numero: ${n.numero}`, `Data: ${dateBR(n.dataEmissao)}`,
      `Valor Liquido: ${money(n.valorLiquido)}`, `Status: ${n.status}`,
      n.numeroNfse ? `NFS-e: ${n.numeroNfse}` : '',
      n.protocoloRecebimento ? `Protocolo: ${n.protocoloRecebimento}` : '',
      n.codigoVerificacao ? `Verificacao: ${n.codigoVerificacao}` : '',
    ].filter(Boolean).join('\n');
    await Share.share({ message: msg, title: 'NFS-e Integra Code' });
  }

  async function downloadPDF(n: NFSENota) {
    if (!n.pdfPath) { Alert.alert('PDF', 'Indisponivel'); return; }
    try {
      const cfg = await getConfig();
      const url = `${cfg.apiUrl}/api/nfse/pdf/${n.id}`;
      const res = await FileSystem.downloadAsync(url, `${FileSystem.documentDirectory}nfse-${n.numero}.pdf`);
      if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(res.uri, { mimeType: 'application/pdf' });
      else Alert.alert('Salvo', res.uri);
    } catch { Alert.alert('Erro', 'Falha ao baixar PDF'); }
  }

  async function saveSettings() {
    await setConfig({ apiUrl, empresa });
    Alert.alert('Salvo', 'Configuracoes atualizadas');
  }

  // ---------------- LOGIN ----------------
  if (screen === 'login') {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="dark" />
        <View style={styles.centered}>
          <View style={styles.logoBox}><Text style={styles.logoText}>IC</Text></View>
          <Text style={styles.logoTitle}>Integra Code</Text>
          <Text style={styles.logoSubtitle}>Gerador de NFS-e</Text>
          {loading && <ActivityIndicator size="large" color="#2563EB" style={{ marginVertical: 16 }} />}
          <TextInput style={styles.input} placeholder="E-mail" autoCapitalize="none" value={email} onChangeText={setEmail} />
          <TextInput style={styles.input} placeholder="Senha" secureTextEntry value={password} onChangeText={setPassword} />
          <TouchableOpacity style={styles.primaryButton} onPress={handleLogin} disabled={loading}>
            <Text style={styles.primaryButtonText}>Entrar</Text>
          </TouchableOpacity>
          <Text style={styles.hint}>admin@integracode.com.br / admin123</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ---------------- DASHBOARD ----------------
  if (screen === 'dashboard') {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="dark" />
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.header}>
            <View>
              <Text style={styles.headerTitle}>Integra Code</Text>
              <Text style={styles.headerSubtitle}>Painel NFS-e</Text>
            </View>
            <TouchableOpacity style={styles.iconButton} onPress={() => setScreen('settings')}>
              <Text style={styles.iconButtonText}>CFG</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.statsGrid}>
            <View style={styles.statCard}><Text style={styles.statValue}>{notes.length}</Text><Text style={styles.statLabel}>Notas</Text></View>
            <View style={styles.statCard}><Text style={styles.statValue}>{notes.filter(n => n.status === 'AUTHORIZED').length}</Text><Text style={styles.statLabel}>Autorizadas</Text></View>
            <View style={styles.statCard}><Text style={styles.statValue}>{charges.length}</Text><Text style={styles.statLabel}>Cobrancas</Text></View>
            <View style={styles.statCard}><Text style={styles.statValue}>{clients.length}</Text><Text style={styles.statLabel}>Clientes</Text></View>
          </View>

          <Text style={styles.sectionTitle}>Acoes Rapidas</Text>
          <View style={styles.quickActions}>
            <TouchableOpacity style={styles.quickAction} onPress={() => { resetForm(); setScreen('new-nfse'); }}>
              <Text style={styles.qaIcon}>+</Text><Text style={styles.qaLabel}>Nova NFS-e</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickAction} onPress={() => setScreen('consult')}>
              <Text style={styles.qaIcon}>?</Text><Text style={styles.qaLabel}>Consultar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickAction} onPress={() => setScreen('charges')}>
              <Text style={styles.qaIcon}>R$</Text><Text style={styles.qaLabel}>Cobrancas</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickAction} onPress={() => { resetForm(); setScreen('new-nfse'); }}>
              <Text style={styles.qaIcon}>#</Text><Text style={styles.qaLabel}>C/ Cobranca</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.sectionTitle}>Ultimas Notas</Text>
          {notes.length === 0 ? <Text style={styles.emptyText}>Nenhuma nota emitida.</Text> :
            notes.slice(0, 5).map(n => (
              <TouchableOpacity key={n.id} style={styles.card} onPress={() => setScreen('consult')}>
                <View style={styles.noteRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardTitle}>NFS-e {n.numero}</Text>
                    <Text style={styles.cardSubtitle}>{dateBR(n.dataEmissao)}</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: n.status === 'AUTHORIZED' ? '#10B981' : n.status === 'REJECTED' ? '#EF4444' : '#F59E0B' }]}>
                    <Text style={styles.statusText}>{n.status}</Text>
                  </View>
                  <Text style={styles.noteValue}>{money(n.valorLiquido)}</Text>
                </View>
              </TouchableOpacity>
            ))}
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ---------------- CLIENTS ----------------
  if (screen === 'clients') {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="dark" />
        <View style={styles.toolbar}>
          <TouchableOpacity onPress={() => setScreen('dashboard')}><Text style={styles.backButton}>Voltar</Text></TouchableOpacity>
          <Text style={styles.toolbarTitle}>Clientes</Text>
          <TouchableOpacity style={styles.iconButton} onPress={() => Alert.prompt('Novo Cliente', 'Nome/Razao Social', async (name?: string) => {
            if (!name) return;
            Alert.prompt('CPF/CNPJ', '', async (doc?: string) => {
              if (!doc) return;
              const c = await api<Cliente>('/clients', { method: 'POST', body: { nome: name, cpfCnpj: doc, razaoSocial: name } });
              setClients([c, ...clients]);
            });
          })}><Text style={styles.iconButtonText}>+</Text></TouchableOpacity>
        </View>
        <FlatList data={clients} keyExtractor={i => String(i.id)} ListEmptyComponent={<Text style={styles.emptyText}>Nenhum cliente.</Text>}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.card} onPress={() => { setSelectedClient(item); setScreen('new-nfse'); }}>
              <Text style={styles.cardTitle}>{item.razaoSocial || item.nome}</Text>
              <Text style={styles.cardSubtitle}>{item.cpfCnpj}</Text>
              {item.email && <Text style={styles.cardDetail}>{item.email}</Text>}
              {item.telefone && <Text style={styles.cardDetail}>{item.telefone}</Text>}
            </TouchableOpacity>
          )} />
      </SafeAreaView>
    );
  }

  // ---------------- SERVICES ----------------
  if (screen === 'services') {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="dark" />
        <View style={styles.toolbar}>
          <TouchableOpacity onPress={() => setScreen('dashboard')}><Text style={styles.backButton}>Voltar</Text></TouchableOpacity>
          <Text style={styles.toolbarTitle}>Servicos / Produtos</Text>
          <TouchableOpacity style={styles.iconButton} onPress={() => Alert.prompt('Descricao', '', async (desc?: string) => {
            if (!desc) return;
            Alert.prompt('Valor Unitario', '', async (val?: string) => {
              if (!val) return;
              const s = await api<Servico>('/services', { method: 'POST', body: { descricao: desc, valorUnitario: parseFloat(val), itemListaServico: '01.00', aliquotaIss: 0.02, unidade: 'UN' } });
              setServices([s, ...services]);
            });
          })}><Text style={styles.iconButtonText}>+</Text></TouchableOpacity>
        </View>
        <FlatList data={services} keyExtractor={i => String(i.id)} ListEmptyComponent={<Text style={styles.emptyText}>Nenhum servico.</Text>}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.card} onPress={() => { addService(item); setScreen('new-nfse'); }}>
              <Text style={styles.cardTitle}>{item.descricao}</Text>
              <Text style={styles.cardSubtitle}>Item: {item.itemListaServico}</Text>
              <Text style={styles.cardDetail}>ISS: {(item.aliquotaIss * 100).toFixed(0)}% | {money(item.valorUnitario)}</Text>
            </TouchableOpacity>
          )} />
      </SafeAreaView>
    );
  }

  // ---------------- NEW NFS-E ----------------
  if (screen === 'new-nfse') {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="dark" />
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.toolbar}>
            <TouchableOpacity onPress={() => setScreen('dashboard')}><Text style={styles.backButton}>Voltar</Text></TouchableOpacity>
            <Text style={styles.toolbarTitle}>Nova NFS-e</Text>
            <View style={{ width: 50 }} />
          </View>

          <Text style={styles.label}>Cliente</Text>
          <TouchableOpacity style={styles.selectBox} onPress={() => setShowClientModal(true)}>
            <Text style={selectedClient ? styles.selectText : styles.selectPlaceholder}>
              {selectedClient ? `${selectedClient.nome} - ${selectedClient.cpfCnpj}` : 'Selecione um cliente'}
            </Text>
          </TouchableOpacity>

          <Text style={styles.label}>Competencia</Text>
          <TextInput style={styles.input} value={competencia} onChangeText={setCompetencia} placeholder="AAAA-MM-DD" />

          <Text style={styles.label}>ISS Retido</Text>
          <View style={styles.radioRow}>
            {['S', 'N'].map(v => (
              <TouchableOpacity key={v} style={[styles.radioButton, issRetido === v && styles.radioButtonActive]} onPress={() => setIssRetido(v)}>
                <Text style={[styles.radioText, issRetido === v && styles.radioTextActive]}>{v === 'S' ? 'Sim' : 'Nao'}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>Desconto (R$)</Text>
          <TextInput style={styles.input} value={desconto} onChangeText={setDesconto} keyboardType="numeric" placeholder="0,00" />

          <Text style={styles.label}>Servicos</Text>
          <TouchableOpacity style={styles.secondaryButton} onPress={() => setShowServiceModal(true)}>
            <Text style={styles.secondaryButtonText}>Adicionar Servico</Text>
          </TouchableOpacity>
          {selectedServices.map(s => (
            <View key={s.servicoId} style={styles.serviceItem}>
              <View style={{ flex: 1 }}>
                <Text style={styles.serviceName}>{s.descricao}</Text>
                <Text style={styles.serviceDetail}>{s.quantidade}x {money(s.valorUnitario)} = {money(s.valorTotal)}</Text>
              </View>
              <TouchableOpacity onPress={() => removeService(s.servicoId)}><Text style={styles.removeText}>Remover</Text></TouchableOpacity>
            </View>
          ))}

          <Text style={styles.label}>Observacoes</Text>
          <TextInput style={[styles.input, styles.textArea]} value={observacoes} onChangeText={setObservacoes} placeholder="Observacoes" multiline numberOfLines={3} />

          <View style={styles.totalBox}>
            <Text style={styles.totalLabel}>Total:</Text>
            <Text style={styles.totalValue}>{money(total)}</Text>
          </View>

          <TouchableOpacity style={styles.primaryButton} onPress={() => emitNFSE(false)} disabled={loading || !selectedClient}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>Emitir NFS-e</Text>}
          </TouchableOpacity>
          <TouchableOpacity style={[styles.primaryButton, styles.primaryButtonSecondary]} onPress={() => emitNFSE(true)} disabled={loading || !selectedClient}>
            <Text style={styles.primaryButtonText}>Emitir + Cobranca (Asaas)</Text>
          </TouchableOpacity>

          <Modal visible={showClientModal} animationType="slide" transparent>
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Selecione Cliente</Text>
                <FlatList data={clients} keyExtractor={i => String(i.id)}
                  renderItem={({ item }) => (
                    <TouchableOpacity style={styles.modalItem} onPress={() => { setSelectedClient(item); setShowClientModal(false); }}>
                      <Text style={styles.modalItemText}>{item.nome} ({item.cpfCnpj})</Text>
                    </TouchableOpacity>
                  )} />
                <TouchableOpacity style={styles.secondaryButton} onPress={() => setShowClientModal(false)}><Text style={styles.secondaryButtonText}>Cancelar</Text></TouchableOpacity>
              </View>
            </View>
          </Modal>

          <Modal visible={showServiceModal} animationType="slide" transparent>
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Selecione Servico</Text>
                <FlatList data={services} keyExtractor={i => String(i.id)}
                  renderItem={({ item }) => (
                    <TouchableOpacity style={styles.modalItem} onPress={() => { addService(item); setShowServiceModal(false); }}>
                      <Text style={styles.modalItemText}>{item.descricao} - {money(item.valorUnitario)}</Text>
                    </TouchableOpacity>
                  )} />
                <TouchableOpacity style={styles.secondaryButton} onPress={() => setShowServiceModal(false)}><Text style={styles.secondaryButtonText}>Cancelar</Text></TouchableOpacity>
              </View>
            </View>
          </Modal>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ---------------- CONSULT ----------------
  if (screen === 'consult') {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="dark" />
        <View style={styles.toolbar}>
          <TouchableOpacity onPress={() => setScreen('dashboard')}><Text style={styles.backButton}>Voltar</Text></TouchableOpacity>
          <Text style={styles.toolbarTitle}>Consultar Notas</Text>
          <View style={{ width: 50 }} />
        </View>
        <FlatList data={notes} keyExtractor={i => String(i.id)} ListEmptyComponent={<Text style={styles.emptyText}>Nenhuma nota.</Text>}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.noteRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>NFS-e {item.numero}</Text>
                  <Text style={styles.cardSubtitle}>{dateBR(item.dataEmissao)} | {item.cliente?.nome || 'Consumidor Final'}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: item.status === 'AUTHORIZED' ? '#10B981' : item.status === 'REJECTED' ? '#EF4444' : '#F59E0B' }]}>
                  <Text style={styles.statusText}>{item.status}</Text>
                </View>
              </View>
              <Text style={styles.cardDetail}>Liquido: {money(item.valorLiquido)}</Text>
              <Text style={styles.cardDetail}>ISS: {money(item.valorIss)} | Base: {money(item.baseCalculoIss)}</Text>
              {item.protocoloRecebimento && <Text style={styles.cardDetail}>Protocolo: {item.protocoloRecebimento}</Text>}
              {item.numeroNfse && <Text style={styles.cardDetail}>Numero NFS-e: {item.numeroNfse}</Text>}
              <View style={styles.noteActions}>
                <TouchableOpacity style={styles.smallButton} onPress={() => share(item)}><Text style={styles.smallButtonText}>Compartilhar</Text></TouchableOpacity>
                <TouchableOpacity style={styles.smallButton} onPress={() => downloadPDF(item)}><Text style={styles.smallButtonText}>PDF</Text></TouchableOpacity>
              </View>
            </View>
          )} />
      </SafeAreaView>
    );
  }

  // ---------------- CHARGES ----------------
  if (screen === 'charges') {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="dark" />
        <View style={styles.toolbar}>
          <TouchableOpacity onPress={() => setScreen('dashboard')}><Text style={styles.backButton}>Voltar</Text></TouchableOpacity>
          <Text style={styles.toolbarTitle}>Cobrancas Asaas</Text>
          <View style={{ width: 50 }} />
        </View>
        <FlatList data={charges} keyExtractor={i => i.id} ListEmptyComponent={<Text style={styles.emptyText}>Nenhuma cobranca.</Text>}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>{item.description}</Text>
              <Text style={styles.cardSubtitle}>{item.billingType} | {dateBR(item.dueDate)}</Text>
              <Text style={styles.cardDetail}>Valor: {money(item.value)}</Text>
              <View style={[styles.statusBadge, { backgroundColor: item.status === 'RECEIVED' ? '#10B981' : item.status === 'PENDING' ? '#F59E0B' : '#EF4444', alignSelf: 'flex-start' }]}>
                <Text style={styles.statusText}>{item.status}</Text>
              </View>
              {item.invoiceUrl && (
                <TouchableOpacity style={styles.smallButton} onPress={() => api<string>(`/charges/${item.id}/invoice`).then(u => Share.share({ message: u, title: 'Fatura' }))}>
                  <Text style={styles.smallButtonText}>Fatura</Text>
                </TouchableOpacity>
              )}
            </View>
          )} />
      </SafeAreaView>
    );
  }

  // ---------------- SETTINGS ----------------
  if (screen === 'settings') {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="dark" />
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.toolbar}>
            <TouchableOpacity onPress={() => setScreen('dashboard')}><Text style={styles.backButton}>Voltar</Text></TouchableOpacity>
            <Text style={styles.toolbarTitle}>Configuracoes</Text>
            <View style={{ width: 50 }} />
          </View>

          <Text style={styles.label}>URL da API</Text>
          <TextInput style={styles.input} value={apiUrl} onChangeText={setApiUrl} placeholder="http://10.0.2.2:3335" />

          <Text style={styles.label}>Razao Social</Text>
          <TextInput style={styles.input} value={empresa.razaoSocial} onChangeText={t => setEmpresa({ ...empresa, razaoSocial: t })} />
          <Text style={styles.label}>CNPJ</Text>
          <TextInput style={styles.input} value={empresa.cnpj} onChangeText={t => setEmpresa({ ...empresa, cnpj: t })} />
          <Text style={styles.label}>Inscricao Municipal</Text>
          <TextInput style={styles.input} value={empresa.inscricaoMunicipal} onChangeText={t => setEmpresa({ ...empresa, inscricaoMunicipal: t })} />
          <Text style={styles.label}>Endereco</Text>
          <TextInput style={styles.input} value={empresa.endereco} onChangeText={t => setEmpresa({ ...empresa, endereco: t })} />
          <Text style={styles.label}>Cidade</Text>
          <TextInput style={styles.input} value={empresa.cidade} onChangeText={t => setEmpresa({ ...empresa, cidade: t })} />
          <Text style={styles.label}>UF</Text>
          <TextInput style={styles.input} value={empresa.uf} onChangeText={t => setEmpresa({ ...empresa, uf: t })} maxLength={2} />
          <Text style={styles.label}>Email</Text>
          <TextInput style={styles.input} value={empresa.email} onChangeText={t => setEmpresa({ ...empresa, email: t })} />
          <Text style={styles.label}>Telefone</Text>
          <TextInput style={styles.input} value={empresa.telefone} onChangeText={t => setEmpresa({ ...empresa, telefone: t })} />

          <TouchableOpacity style={styles.primaryButton} onPress={saveSettings}>
            <Text style={styles.primaryButtonText}>Salvar</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.primaryButton, { backgroundColor: '#EF4444', marginTop: 12 }]} onPress={async () => { await clearToken(); setScreen('login'); }}>
            <Text style={styles.primaryButtonText}>Sair</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  centered: { flex: 1, justifyContent: 'center', padding: 24 },
  logoBox: { width: 80, height: 80, borderRadius: 20, backgroundColor: '#2563EB', justifyContent: 'center', alignItems: 'center', alignSelf: 'center', marginBottom: 12 },
  logoText: { color: '#fff', fontSize: 32, fontWeight: '800' },
  logoTitle: { fontSize: 28, fontWeight: '800', color: '#0F172A', textAlign: 'center' },
  logoSubtitle: { fontSize: 14, color: '#475569', marginTop: 4, textAlign: 'center', marginBottom: 24 },
  content: { padding: 20 },
  input: { backgroundColor: '#fff', borderRadius: 10, borderWidth: 1, borderColor: '#E2E8F0', paddingHorizontal: 14, paddingVertical: 12, marginBottom: 12, fontSize: 15 },
  primaryButton: { backgroundColor: '#2563EB', borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginTop: 10 },
  primaryButtonSecondary: { backgroundColor: '#10B981' },
  primaryButtonText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  secondaryButton: { backgroundColor: '#E2E8F0', borderRadius: 10, paddingVertical: 12, alignItems: 'center', marginTop: 10 },
  secondaryButtonText: { color: '#0F172A', fontWeight: '700', fontSize: 14 },
  hint: { fontSize: 13, color: '#94A3B8', marginTop: 12, textAlign: 'center' },
  toolbar: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  toolbarTitle: { flex: 1, fontSize: 18, fontWeight: '700', color: '#0F172A', textAlign: 'center' },
  backButton: { color: '#2563EB', fontWeight: '600', fontSize: 15 },
  iconButton: { backgroundColor: '#F1F5F9', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  iconButtonText: { color: '#2563EB', fontWeight: '700', fontSize: 14 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 },
  headerTitle: { fontSize: 24, fontWeight: '800', color: '#0F172A' },
  headerSubtitle: { fontSize: 14, color: '#475569', marginTop: 2 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 24 },
  statCard: { flex: 1, minWidth: '45%', backgroundColor: '#fff', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#E2E8F0', alignItems: 'center' },
  statValue: { fontSize: 28, fontWeight: '800', color: '#2563EB' },
  statLabel: { fontSize: 12, color: '#475569', marginTop: 4, textAlign: 'center' },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#0F172A', marginVertical: 12 },
  quickActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  quickAction: { flex: 1, minWidth: '45%', backgroundColor: '#fff', borderRadius: 12, padding: 20, borderWidth: 1, borderColor: '#E2E8F0', alignItems: 'center' },
  qaIcon: { fontSize: 24, fontWeight: '800', color: '#2563EB', marginBottom: 8 },
  qaLabel: { fontSize: 13, fontWeight: '600', color: '#0F172A', textAlign: 'center' },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#E2E8F0' },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#0F172A' },
  cardSubtitle: { fontSize: 13, color: '#475569', marginTop: 2 },
  cardDetail: { fontSize: 13, color: '#475569', marginTop: 4 },
  emptyText: { fontSize: 14, color: '#94A3B8', textAlign: 'center', paddingVertical: 24 },
  noteRow: { flexDirection: 'row', alignItems: 'center' },
  noteValue: { fontSize: 14, fontWeight: '700', color: '#2563EB', marginLeft: 8 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, marginHorizontal: 8 },
  statusText: { fontSize: 11, fontWeight: '700', color: '#fff' },
  noteActions: { flexDirection: 'row', gap: 8, marginTop: 10 },
  smallButton: { backgroundColor: '#F1F5F9', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  smallButtonText: { fontSize: 13, fontWeight: '600', color: '#2563EB' },
  label: { fontSize: 14, fontWeight: '600', color: '#0F172A', marginBottom: 6, marginTop: 12 },
  selectBox: { backgroundColor: '#fff', borderRadius: 10, borderWidth: 1, borderColor: '#E2E8F0', padding: 14, marginBottom: 12 },
  selectText: { fontSize: 15, color: '#0F172A' },
  selectPlaceholder: { fontSize: 15, color: '#94A3B8' },
  radioRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  radioButton: { flex: 1, backgroundColor: '#fff', borderRadius: 10, borderWidth: 1, borderColor: '#E2E8F0', paddingVertical: 12, alignItems: 'center' },
  radioButtonActive: { backgroundColor: '#2563EB', borderColor: '#2563EB' },
  radioText: { fontSize: 15, fontWeight: '600', color: '#0F172A' },
  radioTextActive: { color: '#fff' },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  serviceItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 10, borderWidth: 1, borderColor: '#E2E8F0', padding: 12, marginBottom: 8 },
  serviceName: { fontSize: 14, fontWeight: '600', color: '#0F172A' },
  serviceDetail: { fontSize: 13, color: '#475569', marginTop: 2 },
  removeText: { color: '#EF4444', fontWeight: '600', fontSize: 13 },
  totalBox: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#E2E8F0' },
  totalLabel: { fontSize: 16, color: '#0F172A' },
  totalValue: { fontSize: 22, fontWeight: '800', color: '#2563EB' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: 24 },
  modalContent: { backgroundColor: '#fff', borderRadius: 16, padding: 20, maxHeight: '70%' },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#0F172A', marginBottom: 12 },
  modalItem: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  modalItemText: { fontSize: 15, color: '#0F172A' },
});
