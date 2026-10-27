-- Tira o limite de tamanho (25 MB) dos arquivos enviados pela loja.
update storage.buckets set file_size_limit = null where id = 'relatorios';
