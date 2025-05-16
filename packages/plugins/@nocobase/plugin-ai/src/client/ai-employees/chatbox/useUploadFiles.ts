/**
 * This file is part of the NocoBase (R) project.
 * Copyright (c) 2020-2024 NocoBase Co., Ltd.
 * Authors: NocoBase Team.
 *
 * This project is dual-licensed under AGPL-3.0 and NocoBase Commercial License.
 * For more information, please refer to: https://www.nocobase.com/agreement.
 */

import { useAPIClient, usePlugin, useRequest } from '@nocobase/client';
import PluginFileManagerClient from '@nocobase/plugin-file-manager/client';
import { useChatMessages } from './ChatMessagesProvider';

export function useStorage(storage: string) {
  const name = storage ?? '';
  const url = `storages:getBasicInfo/${name}`;
  const { loading, data } = useRequest<any>(
    {
      url,
    },
    {
      refreshDeps: [name],
      cacheKey: url,
    },
  );
  return (!loading && data?.data) || null;
}

export function useStorageUploadProps(props: any) {
  const plugin = usePlugin(PluginFileManagerClient);
  const storage = useStorage('local');
  const storageType = plugin.getStorageType('local');
  const useStorageTypeUploadProps = storageType?.useUploadProps;
  const storageTypeUploadProps = useStorageTypeUploadProps?.({ storage, rules: storage.rules, ...props }) || {};
  return {
    rules: storage?.rules,
    ...storageTypeUploadProps,
  };
}

export function useUploadProps(props: any) {
  const api = useAPIClient();

  return {
    customRequest({ action, data, file, filename, headers, onError, onProgress, onSuccess, withCredentials }) {
      const formData = new FormData();
      if (data) {
        Object.keys(data).forEach((key) => {
          formData.append(key, data[key]);
        });
      }
      formData.append(filename, file);
      // eslint-disable-next-line promise/catch-or-return
      api.axios
        .post(action, formData, {
          withCredentials,
          headers,
          // onUploadProgress: ({ total, loaded }) => {
          //   onProgress({ percent: Math.round((loaded / total) * 100).toFixed(2) }, file);
          // },
        })
        .then(({ data }) => {
          onSuccess(data, file);
        })
        .catch(onError)
        .finally(() => {});

      return {
        abort() {
          console.log('upload progress is aborted.');
        },
      };
    },
    ...props,
  };
}

export const useUploadFiles = () => {
  const { setAttachments } = useChatMessages();
  const uploadProps = {
    action: 'aiFiles:create',
    onChange({ fileList }) {
      console.log(fileList);
      setAttachments(
        fileList.map((file) => {
          if (file.status === 'done') {
            return file?.response?.data || file;
          }
          return file;
        }),
      );
    },
  };

  const props = useUploadProps(uploadProps);
  const storageUploadProps = useStorageUploadProps(uploadProps);
  return {
    ...props,
    ...uploadProps,
    ...storageUploadProps,
  };
};
