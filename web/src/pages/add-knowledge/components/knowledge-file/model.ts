import { BaseState } from '@/interfaces/common';
import { IKnowledgeFile } from '@/interfaces/database/knowledge';
import kbService from '@/services/kbService';
import { message } from 'antd';
import omit from 'lodash/omit';
import pick from 'lodash/pick';
import { Nullable } from 'typings';
import { DvaModel } from 'umi';

export interface KFModelState extends BaseState {
  isShowCEFwModal: boolean;
  isShowTntModal: boolean;
  isShowSegmentSetModal: boolean;
  isShowRenameModal: boolean;
  tenantIfo: any;
  data: IKnowledgeFile[];
  total: number;
  currentRecord: Nullable<IKnowledgeFile>;
  fileThumbnails: Record<string, string>;
}

const model: DvaModel<KFModelState> = {
  namespace: 'kFModel',
  state: {
    isShowCEFwModal: false,
    isShowTntModal: false,
    isShowSegmentSetModal: false,
    isShowRenameModal: false,
    tenantIfo: {},
    data: [],
    total: 0,
    currentRecord: null,
    searchString: '',
    pagination: {
      current: 1,
      pageSize: 10,
    },
    fileThumbnails: {} as Record<string, string>,
  },
  reducers: {
    updateState(state, { payload }) {
      return {
        ...state,
        ...payload,
      };
    },
    setIsShowRenameModal(state, { payload }) {
      return { ...state, isShowRenameModal: payload };
    },
    setCurrentRecord(state, { payload }) {
      return { ...state, currentRecord: payload };
    },
    setSearchString(state, { payload }) {
      return { ...state, searchString: payload };
    },
    setPagination(state, { payload }) {
      return { ...state, pagination: { ...state.pagination, ...payload } };
    },
    setFileThumbnails(state, { payload }) {
      return { ...state, fileThumbnails: payload };
    },
  },
  effects: {
    *createKf({ payload = {} }, { call }) {
      const { data } = yield call(kbService.createKb, payload);
      const { retcode } = data;
      if (retcode === 0) {
        message.success('Created!');
      }
    },
    *updateKf({ payload = {} }, { call }) {
      const { data } = yield call(kbService.updateKb, payload);
      const { retcode } = data;
      if (retcode === 0) {
        message.success('Modified!');
      }
    },
    *getKfDetail({ payload = {} }, { call }) {
      const { data } = yield call(kbService.get_kb_detail, payload);
    },
    *getKfList({ payload = {} }, { call, put, select }) {
      const state: KFModelState = yield select((state: any) => state.kFModel);
      const requestBody = {
        ...payload,
        page: state.pagination.current,
        page_size: state.pagination.pageSize,
      };
      if (state.searchString) {
        requestBody['keywords'] = state.searchString;
      }
      const { data } = yield call(kbService.get_document_list, requestBody);
      const { retcode, data: res } = data;

      if (retcode === 0) {
        yield put({
          type: 'updateState',
          payload: {
            data: res.docs,
            total: res.total,
          },
        });
      }
    },
    throttledGetDocumentList: [
      function* ({ payload }, { call, put }) {
        yield put({ type: 'getKfList', payload: { kb_id: payload } });
      },
      { type: 'throttle', ms: 1000 }, // TODO: Provide type support for this effect
    ],
    pollGetDocumentList: [
      function* ({ payload }, { call, put }) {
        yield put({ type: 'getKfList', payload: { kb_id: payload } });
      },
      { type: 'poll', delay: 5000 }, // TODO: Provide type support for this effect
    ],
    *updateDocumentStatus({ payload = {} }, { call, put }) {
      const { data } = yield call(
        kbService.document_change_status,
        pick(payload, ['doc_id', 'status']),
      );
      const { retcode } = data;
      if (retcode === 0) {
        message.success('Modified!');
        put({
          type: 'getKfList',
          payload: { kb_id: payload.kb_id },
        });
      }
    },
    *document_rm({ payload = {} }, { call, put }) {
      const { data } = yield call(kbService.document_rm, {
        doc_id: payload.doc_id,
      });
      const { retcode } = data;
      if (retcode === 0) {
        message.success('Deleted!');
        yield put({
          type: 'getKfList',
          payload: { kb_id: payload.kb_id },
        });
      }
      return retcode;
    },
    *document_rename({ payload = {} }, { call, put }) {
      const { data } = yield call(
        kbService.document_rename,
        omit(payload, ['kb_id']),
      );
      const { retcode } = data;
      if (retcode === 0) {
        message.success('rename success！');
        yield put({
          type: 'setIsShowRenameModal',
          payload: false,
        });
        yield put({
          type: 'getKfList',
          payload: { kb_id: payload.kb_id },
        });
      }

      return retcode;
    },
    *document_create({ payload = {} }, { call, put }) {
      const { data } = yield call(kbService.document_create, payload);
      const { retcode } = data;
      if (retcode === 0) {
        put({
          type: 'kFModel/updateState',
          payload: {
            isShowCEFwModal: false,
          },
        });
        message.success('Created!');
      }
      return retcode;
    },
    *document_run({ payload = {} }, { call, put }) {
      const { data } = yield call(
        kbService.document_run,
        omit(payload, ['knowledgeBaseId']),
      );
      const { retcode } = data;
      if (retcode === 0) {
        if (payload.knowledgeBaseId) {
          yield put({
            type: 'getKfList',
            payload: { kb_id: payload.knowledgeBaseId },
          });
        }
        message.success('Operation successfully ！');
      }
      return retcode;
    },
    *document_change_parser({ payload = {} }, { call, put }) {
      const { data } = yield call(kbService.document_change_parser, payload);
      const { retcode } = data;
      if (retcode === 0) {
        put({
          type: 'updateState',
          payload: {
            isShowSegmentSetModal: false,
          },
        });
        message.success('Modified!');
      }
      return retcode;
    },
    *fetch_document_thumbnails({ payload = {} }, { call, put }) {
      const { data } = yield call(kbService.document_thumbnails, payload);
      if (data.retcode === 0) {
        yield put({ type: 'setFileThumbnails', payload: data.data });
      }
    },
  },
};
export default model;