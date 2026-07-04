// Camada de arquivo: salvar backup -> compartilhar; importar -> document picker
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';

// salva o JSON num arquivo e abre a folha de compartilhamento (salvar no Drive, enviar, etc)
export async function exportarArquivo(jsonString) {
  const data = new Date().toISOString().slice(0, 10);
  const nome = `finstats-backup-${data}.json`;
  const uri = FileSystem.cacheDirectory + nome;
  await FileSystem.writeAsStringAsync(uri, jsonString, { encoding: FileSystem.EncodingType.UTF8 });

  const disponivel = await Sharing.isAvailableAsync();
  if (disponivel) {
    await Sharing.shareAsync(uri, {
      mimeType: 'application/json',
      dialogTitle: 'Salvar backup do FinStats',
      UTI: 'public.json',
    });
  }
  return { uri, nome };
}

// abre o picker, le o arquivo escolhido e retorna o conteudo (string)
export async function importarArquivo() {
  const res = await DocumentPicker.getDocumentAsync({
    type: ['application/json', 'text/plain', '*/*'],
    copyToCacheDirectory: true,
    multiple: false,
  });
  if (res.canceled || !res.assets?.length) return null;
  const file = res.assets[0];
  const texto = await FileSystem.readAsStringAsync(file.uri, { encoding: FileSystem.EncodingType.UTF8 });
  return { texto, nome: file.name };
}
